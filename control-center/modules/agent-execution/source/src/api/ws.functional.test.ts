import { describe, it } from "node:test";
import assert from "node:assert/strict";
import WebSocket from "ws";
import {
  closeWebSocket,
  collectJsonMessages,
  createShellSession,
  doRequest,
  openJsonWebSocket,
  startAtermServer,
  uniqueName,
  waitFor,
  waitForMessage,
  type AtermServer,
} from "../test/functional-harness.js";

async function waitForClose(ws: WebSocket, timeoutMs = 5_000): Promise<void> {
  if (ws.readyState === WebSocket.CLOSED) return;
  await Promise.race([
    new Promise<void>((resolve) => ws.once("close", () => resolve())),
    waitFor(() => false, { timeoutMs, intervalMs: timeoutMs, description: "WebSocket close" }).catch((err) => { throw err; }),
  ]);
}

async function openEventsWithMessages(server: AtermServer): Promise<{ ws: WebSocket; messages: any[] }> {
  const messages: any[] = [];
  const ws = new WebSocket(`ws://127.0.0.1:${server.port}/ws/events?token=${server.token}`);
  ws.on("message", (raw) => {
    try { messages.push(JSON.parse(raw.toString())); } catch { messages.push({ type: "_unparseable", raw: raw.toString() }); }
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("events WebSocket open timed out")), 5_000);
    ws.once("open", () => { clearTimeout(timer); resolve(); });
    ws.once("error", (err) => { clearTimeout(timer); reject(err); });
  });
  return { ws, messages };
}

describe("README/doc claims 9-10 — WebSocket channels", { timeout: 60_000 }, () => {
  it("claim 9: /ws/:id streams terminal data and semantic state events", async () => {
    const server = await startAtermServer();
    let ws: WebSocket | undefined;
    try {
      const session = await createShellSession(server, uniqueName("ws-stream"));
      ws = await openJsonWebSocket(server, `/ws/${session.id}`);
      const messages = collectJsonMessages(ws);

      ws.send(JSON.stringify({ type: "input", payload: "printf 'WS_STREAM_OK\\n'\r" }));

      const data = await waitForMessage(messages, (msg) => msg.type === "data" && String(msg.payload).includes("WS_STREAM_OK"), "terminal data event");
      assert.match(data.payload, /WS_STREAM_OK/);

      const state = await waitForMessage(messages, (msg) => msg.type === "state" && typeof msg.state === "string", "session state event");
      assert.equal(typeof state.confidence, "number", "state event must include confidence");
      assert.equal(typeof state.detail, "string", "state event must include detail");
    } finally {
      if (ws) closeWebSocket(ws);
      await server.dispose();
    }
  });

  it("claim 9: a reconnecting /ws/:id client reattaches after server restart", async () => {
    let server: AtermServer | undefined = await startAtermServer();
    const cwd = server.cwd;
    const port = server.port;
    let activeWs: WebSocket | undefined;
    const session = await createShellSession(server, uniqueName("ws-reconnect"));
    const messages: any[] = [];
    let reconnectAttempts = 0;
    let connectedAfterRestart = false;
    let disposed = false;

    async function connectLoop(): Promise<void> {
      while (!disposed) {
        reconnectAttempts++;
        try {
          const ws = await openJsonWebSocket(server!, `/ws/${session.id}`);
          activeWs = ws;
          ws.on("message", (raw) => {
            try { messages.push(JSON.parse(raw.toString())); } catch {}
          });
          ws.once("close", () => {
            if (!disposed) void connectLoop();
          });
          if (reconnectAttempts > 1) connectedAfterRestart = true;
          return;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
    }

    try {
      await connectLoop();
      assert.ok(activeWs, "initial WebSocket should connect");

      await server.stop();
      await waitForClose(activeWs);
      server = await startAtermServer({ cwd, port });

      await waitFor(() => connectedAfterRestart, {
        timeoutMs: 10_000,
        intervalMs: 100,
        description: "client reconnect after server restart",
      });

      activeWs!.send(JSON.stringify({ type: "input", payload: "printf 'WS_RECONNECTED_OK\\n'\r" }));
      await waitFor(() => messages.some((msg) => msg.type === "data" && String(msg.payload).includes("WS_RECONNECTED_OK")), {
        timeoutMs: 10_000,
        intervalMs: 100,
        description: "data after reconnect",
      });
      assert.ok(reconnectAttempts >= 2, `expected at least one reconnect attempt, got ${reconnectAttempts}`);
    } finally {
      disposed = true;
      if (activeWs) closeWebSocket(activeWs);
      await server?.dispose();
    }
  });

  it("claim 10: /ws/events broadcasts lifecycle/state/delete events and respects type filters", async () => {
    const server = await startAtermServer();
    let allEvents: WebSocket | undefined;
    let deleteOnly: WebSocket | undefined;
    try {
      const all = await openEventsWithMessages(server);
      const filtered = await openEventsWithMessages(server);
      allEvents = all.ws;
      deleteOnly = filtered.ws;
      const allMessages = all.messages;
      const filteredMessages = filtered.messages;

      await waitForMessage(allMessages, (msg) => msg.type === "sessions_list", "initial all-events sessions_list");
      await waitForMessage(filteredMessages, (msg) => msg.type === "sessions_list", "initial filtered sessions_list");

      deleteOnly.send(JSON.stringify({ type: "subscribe", types: ["session_deleted"] }));
      await waitForMessage(filteredMessages, (msg) => msg.type === "subscribed" && msg.types.includes("session_deleted"), "filtered subscription ack");

      const sessionName = uniqueName("events");
      const created = await doRequest<{ ok: boolean; id: string }>(server, {
        action: "create",
        session: sessionName,
        command: "bash",
        directory: server.cwd,
        auto_start: true,
      });
      assert.equal(created.data.ok, true);

      await waitForMessage(allMessages, (msg) => msg.type === "session_created" && msg.session?.name === sessionName, "session_created broadcast");
      await waitForMessage(allMessages, (msg) => msg.type === "session_state" && msg.session?.name === sessionName, "session_state broadcast");

      await new Promise((resolve) => setTimeout(resolve, 500));
      assert.equal(
        filteredMessages.some((msg) => msg.type === "session_created" || msg.type === "session_state"),
        false,
        "type-filtered events channel must not receive unsubscribed event types",
      );

      const deleted = await doRequest(server, { action: "delete", session: sessionName });
      assert.equal(deleted.data.ok, true);

      await waitForMessage(allMessages, (msg) => msg.type === "session_deleted" && msg.sessionId === sessionName, "unfiltered session_deleted broadcast");
      await waitForMessage(filteredMessages, (msg) => msg.type === "session_deleted" && msg.sessionId === sessionName, "filtered session_deleted broadcast");
    } finally {
      if (allEvents) closeWebSocket(allEvents);
      if (deleteOnly) closeWebSocket(deleteOnly);
      await server.dispose();
    }
  });
});
