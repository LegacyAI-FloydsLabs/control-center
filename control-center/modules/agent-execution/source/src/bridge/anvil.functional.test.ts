import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { reservePort, doRequest, startAtermServer } from "../test/functional-harness.js";

const ANVIL_SERVER_PATH = process.env.ANVIL_SERVER_PATH
  ?? "/Volumes/SanDisk1Tb/open-anvil/mcp-server/server.js";

/** Opt-in: only run when ATERM_BRIDGE_TEST=1. Requires Open Anvil + Chrome extension. */
const bridgeTestEnabled = process.env.ATERM_BRIDGE_TEST === "1";

async function startFixturePage(): Promise<{ url: string; close: () => Promise<void> }> {
  const { port, release } = await reservePort();
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html>
<html>
  <head><title>ATerm Bridge Functional Fixture</title></head>
  <body>
    <main>
      <h1>ATerm Bridge Navigation OK</h1>
      <p id="claim-proof">BRIDGE_NAVIGATION_PROOF</p>
    </main>
  </body>
</html>`);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
    release(); // port now held by our fixture server
  });
  return {
    url: `http://127.0.0.1:${port}/bridge-fixture`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

describe("README/doc claim 12 — bridge action controls a real browser", { timeout: 25_000, skip: !bridgeTestEnabled }, () => {
  it("returns bridge status and navigates a browser to a real local page", async () => {
    const page = await startFixturePage();
    const server = await startAtermServer({ env: { ANVIL_TIMEOUT: "5000" } });
    try {
      const status = await doRequest(server, { action: "bridge" });
      assert.equal(status.data.ok, true);
      assert.ok(status.data.bridge_status, "bridge status response must include bridge_status");
      assert.ok(Array.isArray(status.data.actions_simplified), "bridge status should advertise simplified actions");

      const navigate = await doRequest(server, { action: "bridge", input: "navigate", session: page.url });
      assert.equal(navigate.data.ok, true, `bridge navigate failed: ${JSON.stringify(navigate.data)}`);
      assert.equal(navigate.data.anvil_connected, true, "navigate must connect to Anvil");
      assert.equal(navigate.data.extension_connected, true, "navigate must reach the browser extension");

      const read = await doRequest(server, { action: "bridge", input: "read" });
      assert.equal(read.data.ok, true, `bridge read failed: ${JSON.stringify(read.data)}`);
      assert.match(JSON.stringify(read.data.result), /BRIDGE_NAVIGATION_PROOF|ATerm Bridge Navigation OK/, "browser readback must prove the page was actually navigated");
    } finally {
      await server.dispose();
      await page.close();
    }
  });
});
