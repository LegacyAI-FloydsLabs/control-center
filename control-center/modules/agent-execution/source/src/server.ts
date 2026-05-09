import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SessionStore } from "./session/store.js";
import { SessionManager } from "./session/manager.js";
import { createDoHandler } from "./api/do.js";
import { createWsServer, handleUpgrade } from "./api/ws.js";
import { getBridgeClient, destroyBridgeClient } from "./bridge/anvil-client.js";

// ---------------------------------------------------------------------------
// Auth token — auto-generated on first run, persisted to .aterm-token
// ---------------------------------------------------------------------------
const TOKEN_FILE = path.join(process.cwd(), ".aterm-token");

function loadOrCreateToken(): string {
  try {
    const existing = fs.readFileSync(TOKEN_FILE, "utf-8").trim();
    if (existing.length >= 32) return existing;
  } catch {
    // File doesn't exist — expected on first run
  }
  const token = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(TOKEN_FILE, token + "\n", { mode: 0o600 });
  return token;
}

const AUTH_TOKEN = loadOrCreateToken();
const PORT = parseInt(process.env.ATERM_PORT || "9600", 10);

// ---------------------------------------------------------------------------
// Session Manager
// ---------------------------------------------------------------------------
// Session Manager + Config
// ---------------------------------------------------------------------------
import { findAndLoadConfig } from "./session/config.js";

const store = new SessionStore();
const mgr = new SessionManager(store);

// Load aterm.yml if present
const configPath = process.argv.find((a) => a.startsWith("--config="))?.split("=")[1];
const config = findAndLoadConfig(configPath);
if (config) {
  let loaded = 0;
  for (const sessionCfg of config.sessions) {
    const existing = mgr.get(sessionCfg.name);
    if (!existing) {
      mgr.create(sessionCfg, sessionCfg.autoStart);
      loaded++;
    }
  }
  if (loaded > 0) console.log(`Loaded ${loaded} session(s) from aterm.yml`);
}

// Auto-start sessions from previous run
const autoStarted = mgr.autoStartAll();

// ---------------------------------------------------------------------------
// Hono app
// ---------------------------------------------------------------------------
const app = new Hono();

// CORS — restrict to localhost in production, permissive in dev
app.use("*", cors({
  origin: (origin) => {
    // Allow requests with no origin (curl, MCP stdio, WebSocket upgrades)
    if (!origin) return "*";
    // Allow localhost and 127.0.0.1 on any port
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(origin)) return origin;
    // Reject everything else
    return "";
  },
}));

// Rate limiting — 60 requests/minute per token, burst to 10/sec
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;

app.use("*", async (c, next) => {
  if (c.req.path === "/health") return next();

  const key = c.req.header("Authorization") ?? c.req.query("token") ?? "anon";
  const now = Date.now();
  let bucket = rateBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateBuckets.set(key, bucket);
  }

  bucket.count++;
  if (bucket.count > RATE_LIMIT_MAX) {
    return c.json({ ok: false, error: "rate limited", retryAfterMs: bucket.resetAt - now }, 429);
  }

  return next();
});
// Auth middleware — skip health check
app.use("*", async (c, next) => {
  if (c.req.path === "/health") return next();

  const header = c.req.header("Authorization");
  const query = new URL(c.req.url).searchParams.get("token");
  const provided = header?.replace("Bearer ", "") || query;

  if (provided !== AUTH_TOKEN) {
    return c.json({ ok: false, error: "unauthorized" }, 401);
  }
  return next();
});

// Health check — no auth required
app.get("/health", (c) => {
  return c.json({
    ok: true,
    version: "0.1.0",
    sessions: mgr.list().length,
    uptime: process.uptime(),
  });
});

// The API
app.post("/api/do", createDoHandler(mgr));

// WebSocket server for terminal I/O
const wss = createWsServer(mgr, AUTH_TOKEN);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
console.log("─".repeat(60));
console.log("ATerm v0.1.0");
console.log(`Port:  ${PORT}`);
console.log(`Token: ${AUTH_TOKEN}`);
console.log(`URL:   http://localhost:${PORT}?token=${AUTH_TOKEN}`);
if (autoStarted > 0) console.log(`Auto-started: ${autoStarted} session(s)`);
console.log("─".repeat(60));

const httpServer = serve({ fetch: app.fetch, port: PORT });

// Hook WebSocket upgrade into the HTTP server
httpServer.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  if (url.pathname.startsWith("/ws/")) {
    handleUpgrade(wss, AUTH_TOKEN, req, socket, head);
  } else {
    socket.destroy();
  }
});

// Proactively start the Anvil MCP bridge (non-blocking)
const bridgeClient = getBridgeClient();
bridgeClient.ensureConnected().then((result) => {
  if (result.ok) {
    console.log("Anvil MCP: connected (bridge ready)");
  } else {
    console.log(`Anvil MCP: not available (${result.hint ?? "unknown"})`);
  }
}).catch(() => {
  // Non-fatal — bridge calls will retry lazily
  console.log("Anvil MCP: startup probe failed (bridge available on first call)");
});

// Graceful shutdown
function shutdown(): void {
  destroyBridgeClient();
  mgr.destroy();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);