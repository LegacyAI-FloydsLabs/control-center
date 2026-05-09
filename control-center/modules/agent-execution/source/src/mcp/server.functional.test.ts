import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  MCP_SERVER_PATH,
  TSX_IMPORT_PATH,
  startAtermServer,
  uniqueName,
  waitForOutput,
} from "../test/functional-harness.js";

const DOCUMENTED_MCP_TOOLS = [
  "aterm_list",
  "aterm_create",
  "aterm_run",
  "aterm_read",
  "aterm_start",
  "aterm_stop",
  "aterm_cancel",
  "aterm_answer",
  "aterm_delete",
  "aterm_note",
  "aterm_search",
  "aterm_history",
  "aterm_broadcast",
] as const;

async function callAtermTool(client: Client, name: string, args: Record<string, unknown> = {}): Promise<any> {
  const result = await client.callTool({ name, arguments: args });
  const content = Array.isArray(result.content) ? result.content : [];
  const text = content
    .filter((block: any) => block.type === "text")
    .map((block: any) => block.text)
    .join("\n");
  assert.ok(text, `${name} should return text content`);
  return JSON.parse(text);
}

describe("README/doc claim 11 — MCP stdio proxy reaches the HTTP API", { timeout: 60_000 }, () => {
  it("lists and successfully calls all 13 documented MCP tools through the running HTTP server", async () => {
    const server = await startAtermServer();
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["--import", TSX_IMPORT_PATH, MCP_SERVER_PATH],
      cwd: server.cwd,
      env: {
        ...process.env,
        ATERM_TOKEN: server.token,
        ATERM_URL: server.url,
      } as Record<string, string>,
    });
    const client = new Client({ name: "aterm-functional-mcp-test", version: "0.1.0" });
    const called = new Set<string>();

    try {
      await client.connect(transport);
      const listed = await client.listTools();
      const names = listed.tools.map((tool) => tool.name);
      for (const toolName of DOCUMENTED_MCP_TOOLS) {
        assert.ok(names.includes(toolName), `MCP listTools must expose documented tool ${toolName}`);
      }

      const list = await callAtermTool(client, "aterm_list", { include_advanced: true });
      called.add("aterm_list");
      assert.equal(list.ok, true);
      assert.ok(Array.isArray(list.sessions));

      const session = uniqueName("mcp");
      const created = await callAtermTool(client, "aterm_create", {
        name: session,
        command: "bash",
        directory: server.cwd,
        auto_start: true,
      });
      called.add("aterm_create");
      assert.equal(created.ok, true);

      const run = await callAtermTool(client, "aterm_run", {
        session,
        input: "printf 'MCP_RUN_OK\\n'",
        wait_until: "MCP_RUN_OK",
        timeout: 5,
        output_mode: "clean",
        include_advanced: true,
      });
      called.add("aterm_run");
      assert.equal(run.ok, true);
      assert.match(run.output, /MCP_RUN_OK/);

      const read = await callAtermTool(client, "aterm_read", { session, output_mode: "clean", include_marks: true, include_advanced: true });
      called.add("aterm_read");
      assert.equal(read.ok, true);
      assert.match(read.output, /MCP_RUN_OK/);

      const noteSet = await callAtermTool(client, "aterm_note", { session, content: "mcp scratch" });
      called.add("aterm_note");
      assert.equal(noteSet.ok, true);
      const noteGet = await callAtermTool(client, "aterm_note", { session });
      assert.equal(noteGet.scratchpad, "mcp scratch");

      const search = await callAtermTool(client, "aterm_search", { query: "MCP_RUN_OK" });
      called.add("aterm_search");
      assert.equal(search.ok, true);
      assert.ok(search.results.some((result: any) => result.session === session));

      const history = await callAtermTool(client, "aterm_history", { session, limit: 20 });
      called.add("aterm_history");
      assert.equal(history.ok, true);
      assert.ok(history.history.some((entry: string) => entry.includes("MCP_RUN_OK")));

      const broadcast = await callAtermTool(client, "aterm_broadcast", { input: "printf 'MCP_BROADCAST_OK\\n'", sessions: [session] });
      called.add("aterm_broadcast");
      assert.equal(broadcast.ok, true);
      assert.equal(broadcast.sent, 1);
      await waitForOutput(server, session, /MCP_BROADCAST_OK/, 10_000);

      const prompt = await callAtermTool(client, "aterm_run", {
        session,
        input: "read -p \"Continue? \" answer; printf 'MCP_ANSWER:%s\\n' \"$answer\"",
        timeout: 1,
      });
      assert.equal(prompt.ok, true);
      const answer = await callAtermTool(client, "aterm_answer", { session, input: "yes" });
      called.add("aterm_answer");
      assert.equal(answer.ok, true);
      await waitForOutput(server, session, /MCP_ANSWER:yes/, 10_000);

      const sleepy = await callAtermTool(client, "aterm_run", { session, input: "sleep 30", timeout: 1 });
      assert.equal(sleepy.ok, true);
      const cancel = await callAtermTool(client, "aterm_cancel", { session });
      called.add("aterm_cancel");
      assert.equal(cancel.ok, true);

      const stop = await callAtermTool(client, "aterm_stop", { session });
      called.add("aterm_stop");
      assert.equal(stop.ok, true);

      const start = await callAtermTool(client, "aterm_start", { session });
      called.add("aterm_start");
      assert.equal(start.ok, true);

      const deleted = await callAtermTool(client, "aterm_delete", { session });
      called.add("aterm_delete");
      assert.equal(deleted.ok, true);

      assert.deepEqual([...called].sort(), [...DOCUMENTED_MCP_TOOLS].sort(), "all 13 documented MCP tools must be called successfully");
    } finally {
      await client.close();
      await server.dispose();
    }
  });
});
