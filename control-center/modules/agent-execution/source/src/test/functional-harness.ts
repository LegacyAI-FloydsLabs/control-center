import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, statSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import net from "node:net";
import WebSocket from "ws";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
export const SERVER_PATH = path.join(REPO_ROOT, "src/server.ts");
export const MCP_SERVER_PATH = path.join(REPO_ROOT, "src/mcp/server.ts");
export const TSX_IMPORT_PATH = path.join(REPO_ROOT, "node_modules/tsx/dist/loader.mjs");

export interface AtermServer {
  proc: ChildProcessWithoutNullStreams;
  cwd: string;
  port: number;
  token: string;
  url: string;
  stdout: () => string;
  stderr: () => string;
  stop: () => Promise<void>;
  dispose: () => Promise<void>;
}

export interface StartServerOptions {
  port?: number;
  cwd?: string;
  configText?: string;
  env?: Record<string, string | undefined>;
  startupTimeoutMs?: number;
}

export interface DoResponse<T = any> {
  status: number;
  data: T;
}

export function uniqueName(prefix: string): string {
  return `${prefix}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function makeTempDir(prefix = "aterm-functional-"): string {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

export async function reservePort(): Promise<{ port: number; release: () => void }> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      if (port < 10000) {
        server.close(() => reject(new Error("reserved port below 10000")));
        return;
      }
      resolve({
        port,
        release: () => server.close(),
      });
    });
  });
}

export async function startAtermServer(options: StartServerOptions = {}): Promise<AtermServer> {
  const cwd = options.cwd ?? makeTempDir();
  mkdirSync(cwd, { recursive: true });

  const maxAttempts = options.port ? 1 : 3;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let port: number;
    if (options.port) {
      port = options.port;
    } else {
      // Reserve and release immediately; child process must bind.
      const reservation = await reservePort();
      port = reservation.port;
      reservation.release();
    }

    const args = ["--import", TSX_IMPORT_PATH, SERVER_PATH];
    if (options.configText) {
      const configPath = path.join(cwd, "aterm.yml");
      writeFileSync(configPath, options.configText);
      args.push(`--config=${configPath}`);
    }

    let stdout = "";
    let stderr = "";
    const proc = spawn(process.execPath, args, {
      cwd,
      env: {
        ...process.env,
        HOME: cwd,
        ATERM_PORT: String(port),
        ...options.env,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");
    proc.stdout.on("data", (chunk: string) => { stdout += chunk; });
    proc.stderr.on("data", (chunk: string) => { stderr += chunk; });

    try {
      await waitFor(async () => {
        if (proc.exitCode !== null) {
          throw new Error(`ATerm server exited early with ${proc.exitCode}\nstdout:\n${stdout}\nstderr:\n${stderr}`);
        }
        return /Token:\s+[a-f0-9]{64}/.test(stdout) && await healthIsReady(port);
      }, {
        timeoutMs: options.startupTimeoutMs ?? 10_000,
        intervalMs: 100,
        description: `ATerm server on port ${port} to start`,
      });
    } catch (err: any) {
      // EADDRINUSE → retry with a fresh port on next iteration
      if (stderr.includes("EADDRINUSE") && attempt < maxAttempts - 1) {
        lastError = err;
        continue;
      }
      throw err;
    }

    const token = stdout.match(/Token:\s+([a-f0-9]{64})/)?.[1];
    if (!token) throw new Error(`server started without printing token\nstdout:\n${stdout}`);

    const url = `http://127.0.0.1:${port}`;
    let stopped = false;

    async function stop(): Promise<void> {
      if (stopped) return;
      stopped = true;
      if (proc.exitCode !== null) return;
      proc.kill("SIGTERM");
      const closed = await Promise.race([
        new Promise<boolean>((resolve) => proc.once("close", () => resolve(true))),
        delay(3_000).then(() => false),
      ]);
      if (!closed && proc.exitCode === null) {
        proc.kill("SIGKILL");
        await Promise.race([
          new Promise<void>((resolve) => proc.once("close", () => resolve())),
          delay(1_000),
        ]);
      }
    }

    return {
      proc,
      cwd,
      port,
      token,
      url,
      stdout: () => stdout,
      stderr: () => stderr,
      stop,
      dispose: async () => {
        await stop();
        rmSync(cwd, { recursive: true, force: true });
      },
    };
  }

  throw lastError ?? new Error("startAtermServer: unreachable");
}

async function healthIsReady(port: number): Promise<boolean> {
  try {
    const resp = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(500) });
    if (!resp.ok) return false;
    const data = await resp.json() as { ok?: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function doRequest<T = any>(server: AtermServer, body: Record<string, unknown>, expectedStatus = 200): Promise<DoResponse<T>> {
  const resp = await fetch(`${server.url}/api/do`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${server.token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json() as T;
  assert.equal(resp.status, expectedStatus, `POST /api/do ${JSON.stringify(body)} returned ${resp.status}: ${JSON.stringify(data)}`);
  return { status: resp.status, data };
}

export async function createShellSession(server: AtermServer, name = uniqueName("shell")): Promise<{ id: string; name: string }> {
  const created = await doRequest<{ ok: boolean; id: string }>(server, {
    action: "create",
    session: name,
    command: "bash",
    directory: server.cwd,
    auto_start: true,
  });
  assert.equal(created.data.ok, true, `create shell session failed: ${JSON.stringify(created.data)}`);
  await waitForSessionState(server, name, (session) => session.status === "ready" || session.status === "busy", 10_000);
  return { id: created.data.id, name };
}

export async function waitForSessionState(
  server: AtermServer,
  session: string,
  predicate: (session: any, readResponse: any) => boolean,
  timeoutMs = 10_000,
): Promise<any> {
  let last: any;
  await waitFor(async () => {
    const resp = await doRequest(server, {
      action: "read",
      session,
      output_mode: "clean",
      include_advanced: true,
      include_marks: true,
      lines: 200,
    });
    last = resp.data;
    return resp.data.ok === true && predicate({ status: resp.data.status, stateResult: resp.data.state_result }, resp.data);
  }, {
    timeoutMs,
    intervalMs: 250,
    description: `session ${session} to reach expected state; last=${JSON.stringify(last)}`,
  });
  return last;
}

export async function waitForOutput(server: AtermServer, session: string, pattern: RegExp, timeoutMs = 10_000): Promise<any> {
  return waitForSessionState(server, session, (_session, read) => pattern.test(read.output), timeoutMs);
}

export async function waitFor<T>(
  predicate: () => T | boolean | Promise<T | boolean>,
  options: { timeoutMs: number; intervalMs?: number; description: string },
): Promise<T | true> {
  const deadline = Date.now() + options.timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const result = await predicate();
      if (result) return result === true ? true : result as T;
    } catch (err) {
      lastError = err;
    }
    await delay(options.intervalMs ?? 100);
  }
  const suffix = lastError instanceof Error ? ` Last error: ${lastError.message}` : "";
  throw new Error(`Timed out waiting for ${options.description}.${suffix}`);
}

export async function openJsonWebSocket(server: AtermServer, pathPart: string): Promise<WebSocket> {
  const normalized = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  const ws = new WebSocket(`ws://127.0.0.1:${server.port}${normalized}?token=${server.token}`);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`WebSocket open timed out for ${normalized}`)), 5_000);
    ws.once("open", () => { clearTimeout(timer); resolve(); });
    ws.once("error", (err) => { clearTimeout(timer); reject(err); });
  });
  return ws;
}

export function collectJsonMessages(ws: WebSocket): any[] {
  const messages: any[] = [];
  ws.on("message", (raw) => {
    try {
      messages.push(JSON.parse(raw.toString()));
    } catch {
      messages.push({ type: "_unparseable", raw: raw.toString() });
    }
  });
  return messages;
}

export async function waitForMessage(messages: any[], predicate: (msg: any) => boolean, description: string, timeoutMs = 10_000): Promise<any> {
  await waitFor(() => messages.find(predicate), { timeoutMs, intervalMs: 100, description });
  return messages.find(predicate);
}

export function closeWebSocket(ws: WebSocket): void {
  if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
    ws.close();
  }
}

export function tokenFileMode(cwd: string): number {
  return statSync(path.join(cwd, ".aterm-token")).mode & 0o777;
}

export function readTokenFile(cwd: string): string {
  return readFileSync(path.join(cwd, ".aterm-token"), "utf8").trim();
}

export function writeExecutableScript(filePath: string, content: string): void {
  writeFileSync(filePath, content, { mode: 0o755 });
}
