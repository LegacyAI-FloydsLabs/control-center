import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import {
  createShellSession,
  doRequest,
  startAtermServer,
  uniqueName,
  waitForOutput,
} from "../test/functional-harness.js";

describe("README/doc claim 8 — checkpoint save/mutate/restore round trip", { timeout: 45_000 }, () => {
  it("restores environment, working directory, scratchpad, and visible scrollback to the saved snapshot", async () => {
    const server = await startAtermServer();
    try {
      const beforeDir = path.join(server.cwd, "before-dir");
      const afterDir = path.join(server.cwd, "after-dir");
      mkdirSync(beforeDir);
      mkdirSync(afterDir);

      const session = await createShellSession(server, uniqueName("checkpoint"));
      await doRequest(server, {
        action: "run",
        session: session.name,
        input: `cd ${beforeDir}; export ATERM_CHECKPOINT_VAR=before; printf 'SNAPSHOT_BEFORE:%s:%s\\n' "$PWD" "$ATERM_CHECKPOINT_VAR"`,
        wait_until: "SNAPSHOT_BEFORE",
        timeout: 5,
      });
      await doRequest(server, { action: "note", session: session.name, input: "scratchpad-before" });

      const saved = await doRequest(server, { action: "checkpoint", session: session.name, input: "claim-8-snapshot" });
      assert.equal(saved.data.ok, true);
      assert.equal(typeof saved.data.checkpoint_id, "string");

      await doRequest(server, {
        action: "run",
        session: session.name,
        input: `cd ${afterDir}; export ATERM_CHECKPOINT_VAR=after; printf 'SNAPSHOT_AFTER:%s:%s\\n' "$PWD" "$ATERM_CHECKPOINT_VAR"`,
        wait_until: "SNAPSHOT_AFTER",
        timeout: 5,
      });
      await doRequest(server, { action: "note", session: session.name, input: "scratchpad-after" });
      await waitForOutput(server, session.name, /SNAPSHOT_AFTER/, 5_000);

      const restored = await doRequest(server, { action: "checkpoint", session: session.name, input: `restore:${saved.data.checkpoint_id}` });
      assert.equal(restored.data.ok, true, `restore failed: ${JSON.stringify(restored.data)}`);
      await waitForOutput(server, session.name, /SNAPSHOT_BEFORE/, 8_000);

      const note = await doRequest(server, { action: "note", session: session.name });
      assert.equal(note.data.scratchpad, "scratchpad-before", "restore must reset scratchpad to checkpoint value");

      const probe = await doRequest(server, {
        action: "run",
        session: session.name,
        input: "printf 'RESTORED_STATE:%s:%s\\n' \"$PWD\" \"$ATERM_CHECKPOINT_VAR\"",
        wait_until: "RESTORED_STATE",
        timeout: 5,
      });
      assert.match(probe.data.output, new RegExp(`RESTORED_STATE:${beforeDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:before`), "restore must recover checkpoint working directory and environment variable");
      assert.doesNotMatch(probe.data.output, /RESTORED_STATE:.*after-dir:after/, "mutated state must not survive restore");
    } finally {
      await server.dispose();
    }
  });
});
