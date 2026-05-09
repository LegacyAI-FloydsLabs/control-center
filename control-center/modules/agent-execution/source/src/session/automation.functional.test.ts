import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  makeTempDir,
  startAtermServer,
  doRequest,
  createShellSession,
  waitFor,
} from "../test/functional-harness.js";

describe("Cron automation wiring", { timeout: 20_000 }, () => {
  it("registers a cron job from aterm.yml automation config on server startup", async () => {
    const cwd = makeTempDir("aterm-cron-config-");
    const configText = `
sessions:
  - name: cron-session
    command: bash
    directory: ${cwd}
    automation: {type: cron, cronExpression: "0 * * * *"}
`;

    const server = await startAtermServer({ cwd, configText });
    try {
      const result = await doRequest(server, {
        action: "automate",
        session: "cron-session",
        input: "list",
      });

      assert.equal(result.data.ok, true, "automate list should succeed");
      assert.ok(Array.isArray(result.data.jobs), "jobs should be an array");
      assert.equal(result.data.jobs.length, 1, "should have exactly 1 cron job for the session");
      assert.equal(result.data.jobs[0].expression, "0 * * * *", "cron expression should match config");
    } finally {
      await server.dispose();
    }
  });

  it("registers and cancels cron jobs via the automate API", async () => {
    const server = await startAtermServer();
    try {
      const { name } = await createShellSession(server);

      const regResult = await doRequest(server, {
        action: "automate",
        session: name,
        input: "register",
        cron_expression: "0 9 * * 1-5",
      });

      assert.equal(regResult.data.ok, true, "register should succeed");
      assert.ok(regResult.data.next_fire, "should return next fire time");

      const listResult = await doRequest(server, {
        action: "automate",
        session: name,
        input: "list",
      });

      assert.equal(listResult.data.jobs.length, 1, "should list 1 job after register");

      const cancelResult = await doRequest(server, {
        action: "automate",
        session: name,
        input: "cancel",
      });

      assert.equal(cancelResult.data.ok, true, "cancel should succeed");

      const afterCancel = await doRequest(server, {
        action: "automate",
        session: name,
        input: "list",
      });

      assert.equal(afterCancel.data.jobs.length, 0, "should list 0 jobs after cancel");
    } finally {
      await server.dispose();
    }
  });

  it("rejects invalid cron expressions via the automate API", async () => {
    const server = await startAtermServer();
    try {
      const { name } = await createShellSession(server);

      const result = await doRequest(server, {
        action: "automate",
        session: name,
        input: "register",
        cron_expression: "invalid",
      }, 400);

      assert.equal(result.data.ok, false, "invalid cron should fail");
      assert.ok(result.data.error, "should have an error message");
    } finally {
      await server.dispose();
    }
  });

  it("cancels cron when session is deleted", async () => {
    const server = await startAtermServer();
    try {
      const { name } = await createShellSession(server);

      await doRequest(server, {
        action: "automate",
        session: name,
        input: "register",
        cron_expression: "0 * * * *",
      });

      await doRequest(server, {
        action: "delete",
        session: name,
      });

      const recreated = await doRequest(server, {
        action: "create",
        session: name,
        command: "bash",
        directory: server.cwd,
      });
      assert.equal(recreated.data.ok, true);

      const listResult = await doRequest(server, {
        action: "automate",
        session: name,
        input: "list",
      });

      assert.equal(listResult.data.jobs.length, 0, "new session should have no cron after old one was deleted");
    } finally {
      await server.dispose();
    }
  });
});

describe("Cron fire end-to-end", { timeout: 100_000 }, () => {
  it("fires a cron job that starts a stopped session at the next minute boundary", async () => {
    const cwd = makeTempDir("aterm-cron-fire-");
    const fireFileName = "cron-fired.txt";
    const server = await startAtermServer({ cwd });
    try {
      const created = await doRequest(server, {
        action: "create",
        session: "cron-target",
        command: `bash -c "date +%s >> ${fireFileName}"`,
        directory: cwd,
      });
      assert.equal(created.data.ok, true);

      // Compute a cron expression for the next minute boundary
      const now = new Date();
      const nextMinute = new Date(now);
      nextMinute.setSeconds(0, 0);
      nextMinute.setMinutes(nextMinute.getMinutes() + 1);
      const cronMin = nextMinute.getMinutes();
      const cronHour = nextMinute.getHours();
      const cronExpr = `${cronMin} ${cronHour} * * *`;

      const regResult = await doRequest(server, {
        action: "automate",
        session: "cron-target",
        input: "register",
        cron_expression: cronExpr,
      });
      assert.equal(regResult.data.ok, true, `cron register should succeed with "${cronExpr}"`);

      const firePath = path.join(cwd, fireFileName);
      await waitFor(() => {
        try {
          const content = readFileSync(firePath, "utf8").trim();
          return content.length > 0;
        } catch {
          return false;
        }
      }, {
        timeoutMs: 90_000,
        intervalMs: 2_000,
        description: "cron job to fire and write timestamp",
      });

      const fired = readFileSync(firePath, "utf8").trim().split("\n").filter(Boolean);
      assert.ok(fired.length >= 1, "cron should have fired at least once");
    } finally {
      await server.dispose();
    }
  });
});
