import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { SessionManager } from "../session/manager.js";
import { SessionStore } from "../session/store.js";
import { makeTempDir, uniqueName } from "../test/functional-harness.js";

describe("README/doc claim 7 — output marks survive scrollback eviction", { timeout: 30_000 }, () => {
  const tempDirs: string[] = [];
  after(() => {
    for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  });

  it("creates >=3 marks for three real commands and keeps stable refs after maxBytes eviction", async () => {
    const cwd = makeTempDir("aterm-marks-");
    tempDirs.push(cwd);
    const dbPath = path.join(cwd, "aterm.db");
    const mgr = new SessionManager(new SessionStore(dbPath));

    try {
      const session = mgr.create({
        name: uniqueName("marks"),
        command: "bash",
        directory: cwd,
        autoStart: false,
        scrollbackBytes: 900,
      });
      mgr.start(session.id);
      await delay(800);

      for (let i = 1; i <= 3; i++) {
        mgr.write(session.id, `printf 'MARK_COMMAND_${i}\\n'`);
        await delay(350);
      }

      const beforeEviction = mgr.marks(session.id);
      const commandMarks = beforeEviction.filter((mark) => /MARK_COMMAND_[123]/.test(mark.text));
      assert.ok(beforeEviction.length >= 3, `three sequential commands should produce >=3 marks, got ${beforeEviction.length}`);
      assert.ok(commandMarks.length >= 3, `expected marks for all three commands, got ${JSON.stringify(beforeEviction)}`);
      const refsBefore = commandMarks.slice(0, 3).map((mark) => ({ ref: mark.ref, text: mark.text }));
      assert.equal(new Set(refsBefore.map((mark) => mark.ref)).size, refsBefore.length, "mark refs must be unique before eviction");

      mgr.write(session.id, "python3 -c \"for i in range(120): print('EVICTION_FILL_%03d_' % i + 'X'*80)\"");
      await delay(1_500);
      assert.ok(mgr.getPty(session.id)!.scrollback.bytes() <= 900, "scrollback should enforce maxBytes after eviction");

      const afterEviction = mgr.marks(session.id);
      for (const saved of refsBefore) {
        const sameRef = afterEviction.find((mark) => mark.ref === saved.ref);
        assert.ok(sameRef, `stable mark ref ${saved.ref} should survive eviction and remain addressable`);
        assert.equal(sameRef.text, saved.text, `mark ref ${saved.ref} should still refer to the same text after eviction`);
      }
    } finally {
      mgr.destroy();
    }
  });
});
