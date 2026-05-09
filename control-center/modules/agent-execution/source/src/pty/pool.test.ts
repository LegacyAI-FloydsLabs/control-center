import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { PtyPool } from "./pool.js";
import { setTimeout as delay } from "node:timers/promises";

describe("PtyPool", () => {
  let pool: PtyPool;

  before(() => {
    pool = new PtyPool();
  });

  after(() => {
    pool.destroyAll();
  });

  it("spawns a bash PTY and receives output", async () => {
    const inst = pool.spawn("test-bash", {
      command: "bash",
      cwd: "/tmp",
    });

    assert.ok(inst.running, "should be running after spawn");
    assert.ok(inst.pid, "should have a pid");

    // Wait for prompt
    await delay(1000);
    assert.ok(inst.scrollback.bytes() > 0, "should have received output");
  });

  it("sends a command and receives the echo", async () => {
    pool.write("test-bash", "echo ATERM_TEST_42\r");
    await delay(500);

    const output = inst().scrollback.clean();
    assert.ok(
      output.includes("ATERM_TEST_42"),
      `output should contain the echo: ${output.slice(-200)}`
    );
  });

  it("tracks command history", () => {
    const i = inst();
    assert.ok(i.lastCommandText?.includes("echo ATERM_TEST_42"));
    assert.ok(i.lastCommandSentAt !== null);
    assert.ok(i.commandHistory.length >= 1);
  });

  it("provides ANSI-clean scrollback", () => {
    inst().scrollback.raw(); // verify raw() doesn't throw
    const clean = inst().scrollback.clean();
    // Raw may contain ANSI codes, clean should not
    assert.ok(clean.length > 0);
    assert.ok(!clean.includes("\x1b["), "clean output should not contain ANSI CSI");
  });

  it("provides delta reads", () => {
    // First delta read for consumer "agent-1" gets everything so far
    const delta1 = inst().scrollback.delta("agent-1");
    assert.ok(delta1.length > 0, "first delta should have content");

    // Second delta read with no new output should be empty
    const delta2 = inst().scrollback.delta("agent-1");
    assert.equal(delta2.length, 0, "second delta should be empty");

    // Send a new command, third delta should have only the new content
    pool.write("test-bash", "echo DELTA_CHECK\r");
    // Give time for output
    return delay(500).then(() => {
      const delta3 = inst().scrollback.delta("agent-1");
      assert.ok(delta3.includes("DELTA_CHECK"), "third delta should contain new output");
    });
  });

  it("kills a PTY", async () => {
    pool.kill("test-bash");
    await delay(500);
    const i = inst();
    assert.ok(!i.running, "should not be running after kill");
  });

  it("removes a PTY", () => {
    pool.spawn("test-remove", { command: "bash", cwd: "/tmp" });
    pool.remove("test-remove");
    assert.equal(pool.get("test-remove"), undefined, "should be gone after remove");
  });

  function inst() {
    const i = pool.get("test-bash");
    assert.ok(i, "test-bash instance should exist");
    return i;
  }
});
