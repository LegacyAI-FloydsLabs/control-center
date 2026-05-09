import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  doRequest,
  readTokenFile,
  startAtermServer,
  tokenFileMode,
  uniqueName,
  waitForOutput,
  waitForSessionState,
  type AtermServer,
} from "../test/functional-harness.js";

const DOCUMENTED_ACTIONS = [
  "list", "read", "run", "stop", "start", "cancel", "answer", "create", "delete",
  "note", "search", "broadcast", "history", "checkpoint", "record", "verify", "batch", "bridge",
] as const;

function expectTier1Shape(body: any): void {
  assert.equal(body.ok, true, `expected ok=true, got ${JSON.stringify(body)}`);
  assert.equal(typeof body.output, "string", "Tier 1 run/read response must include output string");
  assert.equal(typeof body.status, "string", "Tier 1 run/read response must include status");
  assert.equal(typeof body.hint, "string", "Tier 1 response must include hint");
  assert.ok(Array.isArray(body.actions), "Tier 1 response must include available actions");
}

function expectTier2Shape(body: any): void {
  expectTier1Shape(body);
  assert.equal(typeof body.wait_matched, "boolean", "Tier 2 response must include wait_matched boolean");
  assert.equal(typeof body.timed_out, "boolean", "Tier 2 response must include timed_out boolean");
}

function expectTier3Shape(body: any): void {
  expectTier1Shape(body);
  assert.equal(typeof body.reduction_pct, "number", "Tier 3 response must include reduction_pct");
  assert.ok(body.state_result, "Tier 3 response must include state_result");
  assert.equal(typeof body.state_result.state, "string", "Tier 3 state_result must include state");
  assert.equal(typeof body.state_result.confidence, "number", "Tier 3 state_result must include confidence");
  assert.ok(Array.isArray(body.marks), "Tier 3 include_marks must include marks array");
}

describe("README/doc claim 1 — server boot contract", { timeout: 15_000 }, () => {
  it("starts on port 9600, prints token, and persists .aterm-token with 0600 permissions", async () => {
    const server = await startAtermServer({ port: 9600 });
    try {
      assert.match(server.stdout(), /ATerm v0\.1\.0/, "server should print version banner");
      assert.match(server.stdout(), /Port:\s+9600/, "server should print port 9600");
      assert.match(server.stdout(), /Token:\s+[a-f0-9]{64}/, "server should print 256-bit hex token");
      assert.equal(readTokenFile(server.cwd), server.token, "printed token must match .aterm-token contents");
      assert.equal(tokenFileMode(server.cwd), 0o600, ".aterm-token must be mode 0600");

      const health = await fetch(`${server.url}/health`);
      assert.equal(health.status, 200, "health check should prove the server is listening on port 9600");
    } finally {
      await server.dispose();
    }
  });
});

describe("README/doc claim 2 — POST /api/do action and tier contract", { timeout: 45_000 }, () => {
  let server: AtermServer;
  let sessionName: string;
  const observed = new Set<string>();

  async function action<T = any>(body: Record<string, unknown>, expectedStatus = 200) {
    observed.add(String(body.action));
    return doRequest<T>(server, body, expectedStatus);
  }

  it("accepts all 18 documented actions and returns Tier 1/2/3 response shapes", async () => {
    server = await startAtermServer();
    try {
      sessionName = uniqueName("api-main");

      const list = await action({ action: "list" });
      assert.equal(list.data.ok, true);
      assert.ok(Array.isArray(list.data.sessions), "list must return sessions array");
      assert.ok(Array.isArray(list.data.actions), "list must return next actions");

      const created = await action<{ ok: boolean; id: string }>({
        action: "create",
        session: sessionName,
        command: "bash",
        directory: server.cwd,
        auto_start: true,
      });
      assert.equal(created.data.ok, true, `create failed: ${JSON.stringify(created.data)}`);
      assert.equal(typeof created.data.id, "string");
      await waitForSessionState(server, sessionName, (s) => s.status === "ready" || s.status === "busy", 10_000);

      const tier1 = await action({ action: "run", session: sessionName, input: "printf 'TIER1_OK\\n'", timeout: 5 });
      expectTier1Shape(tier1.data);
      assert.match(tier1.data.output, /TIER1_OK/);

      const tier2 = await action({ action: "run", session: sessionName, input: "printf 'TIER2_OK\\n'", wait_until: "TIER2_OK", timeout: 5 });
      expectTier2Shape(tier2.data);
      assert.equal(tier2.data.wait_matched, true, `Tier 2 wait_until should match: ${JSON.stringify(tier2.data)}`);

      const tier3 = await action({
        action: "run",
        session: sessionName,
        input: "printf 'TIER3_OK\\n'",
        wait_until: "TIER3_OK",
        timeout: 5,
        output_mode: "structured",
        include_marks: true,
        include_advanced: true,
      });
      expectTier3Shape(tier3.data);

      const read = await action({ action: "read", session: sessionName, output_mode: "clean", include_marks: true, include_advanced: true });
      expectTier3Shape(read.data);
      assert.match(read.data.output, /TIER3_OK/);

      const noteSet = await action({ action: "note", session: sessionName, input: "claim-grounded scratchpad" });
      assert.equal(noteSet.data.ok, true);
      const noteGet = await action({ action: "note", session: sessionName });
      assert.equal(noteGet.data.scratchpad, "claim-grounded scratchpad");

      const search = await action({ action: "search", input: "TIER[123]_OK" });
      assert.equal(search.data.ok, true);
      assert.ok(Array.isArray(search.data.results), "search must return results array");
      assert.ok(search.data.results.some((r: any) => r.session === sessionName), "search must find session output");

      const history = await action({ action: "history", session: sessionName, lines: 20 });
      assert.equal(history.data.ok, true);
      assert.ok(Array.isArray(history.data.history), "history must return command history array");
      assert.ok(history.data.history.some((h: string) => h.includes("TIER1_OK")), "history must include executed commands");

      const checkpointSave = await action({ action: "checkpoint", session: sessionName, input: "api-claim-checkpoint" });
      assert.equal(checkpointSave.data.ok, true);
      assert.equal(typeof checkpointSave.data.checkpoint_id, "string");
      const checkpointList = await action({ action: "checkpoint", session: sessionName, input: "list" });
      assert.equal(checkpointList.data.ok, true);
      assert.ok(checkpointList.data.checkpoints.some((c: any) => c.id === checkpointSave.data.checkpoint_id));

      const recordStart = await action({ action: "record", session: sessionName, input: "start" });
      assert.equal(recordStart.data.ok, true);
      assert.equal(typeof recordStart.data.recording_id, "string");
      const recordList = await action({ action: "record", session: sessionName, input: "list" });
      assert.equal(recordList.data.ok, true);
      assert.ok(Array.isArray(recordList.data.recordings));
      const recordStop = await action({ action: "record", session: sessionName, input: `stop:${recordStart.data.recording_id}` });
      assert.equal(recordStop.data.ok, true);
      const recordGet = await action({ action: "record", session: sessionName, input: `get:${recordStart.data.recording_id}` });
      assert.equal(recordGet.data.ok, true);
      assert.equal(recordGet.data.recording.id, recordStart.data.recording_id);

      const verify = await action({ action: "verify", session: sessionName, input: "true", timeout: 5 });
      assert.equal(verify.data.ok, true);
      assert.equal(typeof verify.data.passed, "boolean", "verify must return pass/fail boolean");

      const batch = await action({
        action: "batch",
        input: JSON.stringify([
          { action: "read", session: sessionName, output_mode: "clean" },
          { action: "run", session: sessionName, input: "printf 'BATCH_OK\\n'" },
        ]),
      });
      assert.equal(batch.data.ok, true);
      assert.equal(batch.data.count, 2);
      assert.ok(Array.isArray(batch.data.results));

      const broadcast = await action({ action: "broadcast", sessions: [sessionName], input: "printf 'BROADCAST_OK\\n'" });
      assert.equal(broadcast.data.ok, true);
      assert.equal(broadcast.data.total, 1);
      assert.equal(broadcast.data.sent, 1);
      await waitForOutput(server, sessionName, /BROADCAST_OK/, 10_000);

      const promptRun = await action({
        action: "run",
        session: sessionName,
        input: "read -p \"Continue? \" answer; printf 'ANSWER:%s\\n' \"$answer\"",
        timeout: 1,
      });
      expectTier1Shape(promptRun.data);
      const answer = await action({ action: "answer", session: sessionName, input: "yes", wait_until: "ANSWER:yes", timeout: 5 });
      expectTier2Shape(answer.data);
      assert.match(answer.data.output, /ANSWER:yes/);

      const sleepy = await action({ action: "run", session: sessionName, input: "sleep 30", timeout: 1 });
      expectTier1Shape(sleepy.data);
      const cancel = await action({ action: "cancel", session: sessionName });
      assert.equal(cancel.data.ok, true);
      await waitForSessionState(server, sessionName, (s) => s.status === "ready" || s.status === "error", 10_000);

      const stop = await action({ action: "stop", session: sessionName });
      assert.equal(stop.data.ok, true);
      assert.equal(stop.data.status, "stopped");

      const start = await action({ action: "start", session: sessionName });
      assert.equal(start.data.ok, true);
      await waitForSessionState(server, sessionName, (s) => s.status === "ready" || s.status === "busy", 10_000);

      const bridge = await action({ action: "bridge" });
      assert.equal(bridge.data.ok, true);
      assert.ok(bridge.data.bridge_status, "bridge status action must return bridge_status");

      const deleted = await action({ action: "delete", session: sessionName });
      assert.equal(deleted.data.ok, true);

      assert.deepEqual([...observed].sort(), [...DOCUMENTED_ACTIONS].sort(), "every documented /api/do action must be exercised");
    } finally {
      await server.dispose();
    }
  });
});
