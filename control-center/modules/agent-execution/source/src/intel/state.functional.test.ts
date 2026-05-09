import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createShellSession,
  doRequest,
  startAtermServer,
  uniqueName,
  waitForSessionState,
} from "../test/functional-harness.js";

describe("README/doc claims 3-5 — real terminal state detection", { timeout: 45_000 }, () => {
  it("claim 3: reaches ready after a real bash prompt with confidence >= 0.85", async () => {
    const server = await startAtermServer();
    try {
      const session = await createShellSession(server, uniqueName("state-ready"));
      const read = await waitForSessionState(
        server,
        session.name,
        (s) => s.stateResult?.state === "ready" && s.stateResult.confidence >= 0.85,
        10_000,
      );

      assert.equal(read.status, "ready");
      assert.equal(read.state_result.state, "ready");
      assert.ok(read.state_result.confidence >= 0.85, `confidence ${read.state_result.confidence} < 0.85`);
      assert.match(read.state_result.detail, /bash|prompt|dollar|gt|#|>/i);
    } finally {
      await server.dispose();
    }
  });

  it("claim 4: reaches waiting_for_input for read -p with prompt text in detail", async () => {
    const server = await startAtermServer();
    try {
      const session = await createShellSession(server, uniqueName("state-input"));
      await doRequest(server, {
        action: "run",
        session: session.name,
        input: "read -p \"Continue? \" answer; printf 'ANSWER:%s\\n' \"$answer\"",
        timeout: 1,
      });

      const read = await waitForSessionState(
        server,
        session.name,
        (s) => s.stateResult?.state === "waiting_for_input" && /Continue\?/.test(s.stateResult.detail),
        8_000,
      );

      assert.equal(read.status, "waiting_for_input");
      assert.equal(read.state_result.state, "waiting_for_input");
      assert.ok(read.state_result.confidence >= 0.85, `confidence ${read.state_result.confidence} < 0.85`);
      assert.match(read.state_result.detail, /Continue\?/);
    } finally {
      await server.dispose();
    }
  });

  it("claim 5: reaches error after an equivalent shell error", async () => {
    const server = await startAtermServer();
    try {
      const session = await createShellSession(server, uniqueName("state-error"));
      await doRequest(server, {
        action: "run",
        session: session.name,
        input: "definitely_not_a_real_command_for_aterm_claim_5",
        timeout: 5,
      });

      const read = await waitForSessionState(
        server,
        session.name,
        (s) => s.stateResult?.state === "error" && /command-not-found|command not found/i.test(s.stateResult.detail),
        10_000,
      );

      assert.equal(read.status, "error");
      assert.equal(read.state_result.state, "error");
      assert.match(read.state_result.detail, /command-not-found|command not found/i);
    } finally {
      await server.dispose();
    }
  });
});
