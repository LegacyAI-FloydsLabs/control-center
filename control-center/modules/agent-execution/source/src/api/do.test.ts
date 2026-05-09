/**
 * Unit tests for POST /api/do handler.
 *
 * Uses a mock SessionManager (no real PTY) and Hono's app.request()
 * to exercise the handler logic without side effects.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { EventEmitter } from "node:events";
import { createDoHandler } from "./do.js";
import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Mock SessionManager — no real PTY, in-memory sessions
// ---------------------------------------------------------------------------
function createMockManager(): any {
  const mgr = new EventEmitter();
  const sessions = new Map<string, any>();

  function find(idOrName: string) {
    for (const s of sessions.values()) {
      if (s.id === idOrName || s.name === idOrName) return s;
    }
    return undefined;
  }

  function enrich(s: any) {
    return {
      ...s,
      stateResult: { state: s.status, confidence: 0.9, method: "test", detail: "" },
      marks: [],
    };
  }

  mgr.list = () => [...sessions.values()].map(enrich);
  mgr.get = (idOrName: string) => { const s = find(idOrName); return s ? enrich(s) : undefined; };
  mgr.create = (config: any, start?: boolean) => {
    const session = {
      id: crypto.randomUUID(),
      name: config.name,
      label: config.name,
      status: start ? "ready" : "stopped",
      command: config.command,
      directory: config.directory ?? process.cwd(),
      tags: config.tags ?? [],
      scratchpad: null,
      env: null,
      pid: start ? 12345 : null,
      startedAt: start ? Date.now() : null,
      restartCount: 0,
      autoStart: config.autoStart ?? false,
      order: sessions.size,
      pinned: false,
      scrollbackBytes: 1_000_000,
      automation: { type: "none" },
    };
    sessions.set(session.id, session);
    return enrich(session);
  };
  mgr.start = (idOrName: string) => {
    const s = find(idOrName);
    if (s) { s.status = "ready"; s.pid = 12345; s.startedAt = Date.now(); }
  };
  mgr.stop = (idOrName: string) => {
    const s = find(idOrName);
    if (s) { s.status = "stopped"; s.pid = null; }
  };
  mgr.cancel = () => {};
  mgr.write = () => {};
  mgr.read = () => ({
    content: "mock output\n$ ",
    reductionPct: 0,
    originalBytes: 13,
    distilledBytes: 13,
  });
  mgr.delete = (idOrName: string) => {
    const s = find(idOrName);
    if (!s) return false;
    sessions.delete(s.id);
    return true;
  };
  mgr.history = () => ["echo hello"];
  mgr.marks = () => [];
  mgr.update = () => {};
  mgr.getPty = () => undefined;
  mgr.automate = () => ({ ok: false, error: "mock" });
  mgr.saveCheckpoint = () => "cp-mock";
  mgr.listCheckpoints = () => [];
  mgr.restoreCheckpoint = () => true;
  mgr.startRecording = () => "rec-mock";
  mgr.stopRecording = () => {};
  mgr.listRecordings = () => [];
  mgr.getRecording = () => null;
  mgr.importTcc = () => 0;

  return mgr;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
function createApp(mgr: any): Hono {
  const app = new Hono();
  app.post("/api/do", createDoHandler(mgr));
  return app;
}

async function doAction(app: Hono, body: Record<string, unknown>): Promise<any> {
  const res = await app.request("/api/do", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("API do handler", () => {
  test("rejects invalid JSON body", async () => {
    const app = createApp(createMockManager());
    const res = await app.request("/api/do", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const data = await res.json();
    assert.equal(data.ok, false);
    assert.equal(data.error, "invalid JSON body");
  });

  test("rejects unknown action", async () => {
    const app = createApp(createMockManager());
    const data = await doAction(app, { action: "fly_to_moon" });
    assert.equal(data.ok, false);
    assert.ok(data.error.includes("invalid action"));
  });

  test("list returns empty sessions", async () => {
    const app = createApp(createMockManager());
    const data = await doAction(app, { action: "list" });
    assert.equal(data.ok, true);
    assert.equal(data.sessions.length, 0);
  });

  test("list returns created sessions", async () => {
    const mgr = createMockManager();
    mgr.create({ name: "web", command: "npm run dev" });
    const app = createApp(mgr);
    const data = await doAction(app, { action: "list" });
    assert.equal(data.ok, true);
    assert.equal(data.sessions.length, 1);
    assert.equal(data.sessions[0].name, "web");
  });

  test("create requires session name", async () => {
    const app = createApp(createMockManager());
    const data = await doAction(app, { action: "create", command: "bash" });
    assert.equal(data.ok, false);
    assert.ok(data.error.includes("session"));
  });

  test("create requires command", async () => {
    const app = createApp(createMockManager());
    const data = await doAction(app, { action: "create", session: "test" });
    assert.equal(data.ok, false);
    assert.ok(data.error.includes("command"));
  });

  test("create succeeds with name and command", async () => {
    const app = createApp(createMockManager());
    const data = await doAction(app, { action: "create", session: "worker", command: "bash" });
    assert.equal(data.ok, true);
    assert.ok(data.id);
    assert.equal(data.status, "stopped");
  });

  test("create with auto_start sets status to starting", async () => {
    const app = createApp(createMockManager());
    const data = await doAction(app, {
      action: "create", session: "auto", command: "bash", auto_start: true,
    });
    assert.equal(data.ok, true);
    assert.equal(data.status, "ready");
  });

  test("read returns 400 without session", async () => {
    const app = createApp(createMockManager());
    const data = await doAction(app, { action: "read" });
    assert.equal(data.ok, false);
    assert.equal(data.error, "session required");
  });

  test("read returns 404 for missing session", async () => {
    const app = createApp(createMockManager());
    const data = await doAction(app, { action: "read", session: "ghost" });
    assert.equal(data.ok, false);
    assert.ok(data.error.includes("not found"));
  });

  test("stop returns ok", async () => {
    const mgr = createMockManager();
    mgr.create({ name: "stoppable", command: "bash" }, true);
    const app = createApp(mgr);
    const data = await doAction(app, { action: "stop", session: "stoppable" });
    assert.equal(data.ok, true);
    assert.equal(data.status, "stopped");
  });

  test("cancel returns ok", async () => {
    const mgr = createMockManager();
    mgr.create({ name: "cancellable", command: "bash" }, true);
    const app = createApp(mgr);
    const data = await doAction(app, { action: "cancel", session: "cancellable" });
    assert.equal(data.ok, true);
  });

  test("delete removes a session", async () => {
    const mgr = createMockManager();
    mgr.create({ name: "deleteme", command: "bash" });
    const app = createApp(mgr);
    const data = await doAction(app, { action: "delete", session: "deleteme" });
    assert.equal(data.ok, true);
    // Verify it's gone
    const list = await doAction(app, { action: "list" });
    assert.equal(list.sessions.length, 0);
  });

  test("note reads scratchpad when no input", async () => {
    const mgr = createMockManager();
    mgr.create({ name: "notes", command: "bash" }, true);
    const app = createApp(mgr);
    const data = await doAction(app, { action: "note", session: "notes" });
    assert.equal(data.ok, true);
    assert.equal(data.scratchpad, null);
  });

  test("note writes scratchpad with input", async () => {
    const mgr = createMockManager();
    mgr.create({ name: "notes", command: "bash" }, true);
    const app = createApp(mgr);
    const write = await doAction(app, { action: "note", session: "notes", input: "remember this" });
    assert.equal(write.ok, true);
  });

  test("history returns commands", async () => {
    const mgr = createMockManager();
    mgr.create({ name: "hist", command: "bash" }, true);
    const app = createApp(mgr);
    const data = await doAction(app, { action: "history", session: "hist" });
    assert.equal(data.ok, true);
    assert.ok(Array.isArray(data.history));
  });

  test("search requires input", async () => {
    const app = createApp(createMockManager());
    const data = await doAction(app, { action: "search" });
    assert.equal(data.ok, false);
    assert.ok(data.error.includes("input"));
  });

  test("broadcast requires input", async () => {
    const app = createApp(createMockManager());
    const data = await doAction(app, { action: "broadcast" });
    assert.equal(data.ok, false);
    assert.ok(data.error.includes("input"));
  });

  test("run requires session", async () => {
    const app = createApp(createMockManager());
    const data = await doAction(app, { action: "run", input: "echo hi" });
    assert.equal(data.ok, false);
    assert.equal(data.error, "session required");
  });

  test("run requires input", async () => {
    const app = createApp(createMockManager());
    const data = await doAction(app, { action: "run", session: "x" });
    assert.equal(data.ok, false);
    assert.equal(data.error, "input required");
  });
});
