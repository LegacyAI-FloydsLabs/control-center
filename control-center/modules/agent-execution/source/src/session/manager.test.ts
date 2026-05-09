import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { SessionManager } from "./manager.js";
import { SessionStore } from "./store.js";
import { setTimeout as delay } from "node:timers/promises";
import fs from "node:fs";

const TEST_DB = "/tmp/aterm-test-" + Date.now() + ".db";

describe("SessionManager", () => {
  let mgr: SessionManager;

  before(() => {
    const store = new SessionStore(TEST_DB);
    mgr = new SessionManager(store);
  });

  after(() => {
    mgr.destroy();
    try { fs.unlinkSync(TEST_DB); } catch {}
    try { fs.unlinkSync(TEST_DB + "-wal"); } catch {}
    try { fs.unlinkSync(TEST_DB + "-shm"); } catch {}
  });

  it("creates and lists sessions", () => {
    mgr.create({ name: "test-bash", command: "bash", directory: "/tmp" });
    const sessions = mgr.list();
    assert.ok(sessions.length >= 1);
    const s = sessions.find((s) => s.name === "test-bash");
    assert.ok(s, "should find created session");
    assert.equal(s.status, "stopped");
  });

  it("starts a session and detects running state", async () => {
    const session = mgr.get("test-bash");
    assert.ok(session);
    mgr.start(session.id);
    await delay(1000);

    const updated = mgr.get(session.id);
    assert.ok(updated);
    assert.ok(updated.pid, "should have a pid after start");
    assert.notEqual(updated.status, "stopped", "should not be stopped after start");
  });

  it("sends command and reads output", async () => {
    const session = mgr.get("test-bash")!;
    mgr.write(session.id, "echo MANAGER_TEST_99");
    await delay(500);

    const output = mgr.read(session.id, "clean");
    assert.ok(output.content.includes("MANAGER_TEST_99"));
  });

  it("reads distilled output in summary mode", async () => {
    const session = mgr.get("test-bash")!;
    const summary = mgr.read(session.id, "summary");
    assert.ok(summary.content.length > 0);
    assert.equal(summary.mode, "summary");
  });

  it("reads delta output", async () => {
    const session = mgr.get("test-bash")!;
    // First delta read gets everything
    const d1 = mgr.read(session.id, "delta", { consumerId: "test-agent" });
    assert.ok(d1.content.length > 0);

    // Second delta should be empty (no new output)
    const d2 = mgr.read(session.id, "delta", { consumerId: "test-agent" });
    assert.equal(d2.content.length, 0);

    // Send new command, third delta should have it
    mgr.write(session.id, "echo DELTA_MGR_CHECK");
    await delay(500);
    const d3 = mgr.read(session.id, "delta", { consumerId: "test-agent" });
    assert.ok(d3.content.includes("DELTA_MGR_CHECK"));
  });

  it("gets output marks", async () => {
    const session = mgr.get("test-bash")!;
    const marks = mgr.marks(session.id);
    assert.ok(marks.length >= 1, "should have marks after commands");
  });

  it("records command history", () => {
    const session = mgr.get("test-bash")!;
    const history = mgr.history(session.id);
    assert.ok(history.length >= 1);
    assert.ok(history.some((h) => h.includes("MANAGER_TEST_99")));
  });

  it("updates scratchpad", () => {
    const session = mgr.get("test-bash")!;
    mgr.update(session.id, { scratchpad: "fixed type error in lib.rs:42" });
    const updated = mgr.get(session.id)!;
    assert.equal(updated.scratchpad, "fixed type error in lib.rs:42");
  });

  it("stops a session", async () => {
    const session = mgr.get("test-bash")!;
    mgr.stop(session.id);
    await delay(500);
    const updated = mgr.get(session.id)!;
    assert.ok(!updated.pid, "should not have pid after stop");
  });

  it("deletes a session", () => {
    const session = mgr.get("test-bash")!;
    const deleted = mgr.delete(session.id);
    assert.ok(deleted);
    assert.equal(mgr.get("test-bash"), undefined);
  });

  it("persists across store reload", () => {
    // Create a session in the current store
    mgr.create({ name: "persist-test", command: "echo hi", directory: "/tmp" });

    // Create a new store from the same DB file
    const store2 = new SessionStore(TEST_DB);
    const session = store2.get("persist-test");
    assert.ok(session, "session should persist in SQLite");
    assert.equal(session.name, "persist-test");
    store2.close();
  });
});
