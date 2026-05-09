/**
 * WebSocket handlers for ATerm.
 *
 * Two WebSocket channels:
 *
 * 1. /ws/:sessionId — per-session terminal I/O (existing)
 *    Server→Client: data, state, scrollback
 *    Client→Server: input, resize
 *
 * 2. /ws/events — global event channel (new in Phase 3)
 *    Server→Client: session_created, session_deleted, session_state,
 *                   session_started, session_stopped, sessions_list
 *    Client→Server: (none — read-only push channel)
 *
 * This replaces sidebar polling with push notifications, fulfilling
 * the project's own thesis: "terminal notifies agent, not agent polls terminal."
 */
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, WebSocket } from "ws";
import type { SessionManager } from "../session/manager.js";

interface WsMessage {
  type: string;
  payload?: string;
  cols?: number;
  rows?: number;
}

// ---------------------------------------------------------------------------
// Global event clients
// ---------------------------------------------------------------------------
const eventClients = new Set<WebSocket>();

function broadcastEvent(event: Record<string, any>): void {
  const msg = JSON.stringify(event);
  for (const ws of eventClients) {
    if (ws.readyState !== WebSocket.OPEN) continue;

    const filter = (ws as any)._atermFilter;
    if (filter?.active()) {
      if (filter.sessions.size > 0 && event.session) {
        const sid = event.session.id ?? event.sessionId ?? "";
        const sname = event.session.name ?? "";
        if (!filter.sessions.has(sid) && !filter.sessions.has(sname)) continue;
      }
      if (filter.types.size > 0 && event.type) {
        if (!filter.types.has(event.type)) continue;
      }
    }

    ws.send(msg);
  }
}

// State event throttle — max 10/sec per session, ensures last event always delivers
const STATE_THROTTLE_MS = 100;
const stateThrottles = new Map<string, {
  lastSent: number;
  timer: ReturnType<typeof setTimeout> | null;
  pending: Record<string, any> | null;
}>();

function throttledStateBroadcast(sessionId: string, event: Record<string, any>): void {
  const now = Date.now();
  const entry = stateThrottles.get(sessionId);

  if (!entry || now - entry.lastSent >= STATE_THROTTLE_MS) {
    if (entry?.timer) clearTimeout(entry.timer);
    stateThrottles.set(sessionId, { lastSent: now, timer: null, pending: null });
    broadcastEvent(event);
  } else {
    entry.pending = event;
    if (!entry.timer) {
      entry.timer = setTimeout(() => {
        const e = stateThrottles.get(sessionId);
        if (e?.pending) {
          broadcastEvent(e.pending);
          e.lastSent = Date.now();
          e.pending = null;
        }
        if (e) e.timer = null;
      }, STATE_THROTTLE_MS - (now - entry.lastSent));
    }
  }
}

// ---------------------------------------------------------------------------
// Terminal WS Server
// ---------------------------------------------------------------------------
export function createWsServer(mgr: SessionManager, _authToken: string): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Wire up global event broadcasting from SessionManager events
  mgr.on("spawn", (id: string, pid: number) => {
    const s = mgr.get(id);
    broadcastEvent({
      type: "session_started",
      session: { id, name: s?.name, status: "starting", pid },
    });
  });

  mgr.on("exit", (id: string, exitCode: number) => {
    const s = mgr.get(id);
    broadcastEvent({
      type: "session_stopped",
      session: { id, name: s?.name, status: "exited", exitCode },
    });
  });

  mgr.on("state", (id: string, result: any) => {
    const s = mgr.get(id);
    throttledStateBroadcast(id, {
      type: "session_state",
      session: { id, name: s?.name, status: result.state, stateResult: result },
    });
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const parts = url.pathname.split("/").filter(Boolean);

    // Route: /ws/events → global event channel
    if (parts[1] === "events") {
      handleEventsConnection(ws, mgr);
      return;
    }

    // Route: /ws/:sessionId → terminal I/O
    const sessionId = parts[1];
    if (!sessionId) {
      ws.close(4000, "missing session ID — use /ws/:sessionId or /ws/events");
      return;
    }

    handleTerminalConnection(ws, sessionId, mgr);
  });

  return wss;
}

// ---------------------------------------------------------------------------
// /ws/events handler
// ---------------------------------------------------------------------------
function handleEventsConnection(ws: WebSocket, mgr: SessionManager): void {
  const filterSessions = new Set<string>();
  const filterTypes = new Set<string>();
  let filterActive = false;

  eventClients.add(ws);

  // Send initial session list
  const sessions = mgr.list().map((s) => ({
    id: s.id, name: s.name, label: s.label, status: s.status, tags: s.tags, pid: s.pid,
  }));
  safeSend(ws, { type: "sessions_list", sessions });

  // Handle filter subscription messages from agents
  ws.on("message", (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "subscribe") {
        filterActive = true;
        if (msg.sessions) for (const s of msg.sessions) filterSessions.add(s);
        if (msg.types) for (const t of msg.types) filterTypes.add(t);
        safeSend(ws, { type: "subscribed", sessions: [...filterSessions], types: [...filterTypes] });
      }
      if (msg.type === "unsubscribe") {
        filterActive = false;
        filterSessions.clear();
        filterTypes.clear();
        safeSend(ws, { type: "unsubscribed" });
      }
    } catch { /* ignore */ }
  });

  ws.on("close", () => { eventClients.delete(ws); });

  // Attach filter metadata for broadcastEvent
  (ws as any)._atermFilter = { active: () => filterActive, sessions: filterSessions, types: filterTypes };
}

// ---------------------------------------------------------------------------
// /ws/:sessionId handler
// ---------------------------------------------------------------------------
function handleTerminalConnection(ws: WebSocket, sessionId: string, mgr: SessionManager): void {
  const session = mgr.get(sessionId);
  if (!session) {
    ws.close(4004, `session not found: ${sessionId}`);
    return;
  }

  // Auto-start if stopped
  if (session.status === "stopped" || session.status === "exited") {
    try {
      mgr.start(session.id);
    } catch {
      ws.close(4500, "failed to start session");
      return;
    }
  }

  // Send initial scrollback
  const pty = mgr.getPty(session.id);
  if (pty) {
    const scrollback = pty.scrollback.raw();
    if (scrollback.length > 0) {
      safeSend(ws, { type: "scrollback", payload: scrollback });
    }
  }

  // Forward PTY output
  const onData = (id: string, data: string) => {
    if (id === session.id) {
      safeSend(ws, { type: "data", payload: data });
    }
  };
  mgr.on("data", onData);

  // Forward state changes
  const onState = (id: string, result: any) => {
    if (id === session.id) {
      safeSend(ws, { type: "state", ...result });
    }
  };
  mgr.on("state", onState);

  // Handle incoming messages
  ws.on("message", (raw: Buffer) => {
    try {
      const msg: WsMessage = JSON.parse(raw.toString());
      switch (msg.type) {
        case "input":
          if (msg.payload) mgr.write(session.id, msg.payload);
          break;
        case "resize":
          if (msg.cols && msg.rows) {
            const p = mgr.getPty(session.id);
            if (p?.process) p.process.resize(msg.cols, msg.rows);
          }
          break;
      }
    } catch { /* ignore malformed */ }
  });

  // Cleanup
  ws.on("close", () => {
    mgr.off("data", onData);
    mgr.off("state", onState);
  });
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

/** Authenticate and route WebSocket upgrade */
export function handleUpgrade(
  wss: WebSocketServer,
  authToken: string,
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
): void {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  if (token !== authToken) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
}

function safeSend(ws: WebSocket, data: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/** Notify event clients that a session was created */
export function notifySessionCreated(session: { id: string; name: string; status: string }): void {
  broadcastEvent({ type: "session_created", session });
}

/** Notify event clients that a session was deleted */
export function notifySessionDeleted(sessionId: string): void {
  broadcastEvent({ type: "session_deleted", sessionId });
}
