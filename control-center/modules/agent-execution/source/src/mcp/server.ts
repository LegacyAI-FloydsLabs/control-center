/**
 * ATerm MCP Server — thin stdio proxy to the ATerm HTTP API.
 *
 * Architecture decision (from reviewer critique):
 *   The MCP server does NOT instantiate its own SessionStore/SessionManager/PtyPool.
 *   It forwards every tool call to POST /api/do on the running ATerm HTTP server.
 *   This prevents dual-PTY-pool races when both processes target the same aterm.db.
 *
 * The ATerm HTTP server is the single source of truth for session state.
 * The MCP server is a protocol adapter — stdio JSON-RPC ↔ HTTP REST.
 *
 * Requires: ATerm server running on ATERM_URL (default http://localhost:9600)
 *           with auth token from ATERM_TOKEN env or ~/.aterm-token
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Config — discover ATerm server URL and auth token
// ---------------------------------------------------------------------------
const ATERM_URL = process.env.ATERM_URL ?? "http://localhost:9600";

function loadToken(): string {
  if (process.env.ATERM_TOKEN) return process.env.ATERM_TOKEN;
  try {
    const tokenFile = path.join(process.env.HOME ?? "/tmp", ".aterm-token");
    // Try project-local first, then home
    for (const p of [path.join(process.cwd(), ".aterm-token"), tokenFile]) {
      try {
        const t = fs.readFileSync(p, "utf-8").trim();
        if (t.length >= 32) return t;
      } catch { /* next */ }
    }
  } catch { /* fall through */ }
  throw new Error("No ATERM_TOKEN env var and no .aterm-token file found. Is ATerm server running?");
}

const TOKEN = loadToken();

/** Forward a request to the ATerm HTTP API */
async function apiDo(body: Record<string, unknown>): Promise<any> {
  const resp = await fetch(`${ATERM_URL}/api/do`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  return resp.json();
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------
const server = new McpServer({
  name: "aterm",
  version: "0.1.0",
});

// ---------------------------------------------------------------------------
// Tools — each one forwards to POST /api/do
// ---------------------------------------------------------------------------

server.tool(
  "aterm_list",
  "List all terminal sessions with their current semantic state",
  {
    include_advanced: z.boolean().optional().describe("Include detailed state info"),
  },
  async ({ include_advanced }) => {
    const data = await apiDo({ action: "list", include_advanced });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "aterm_create",
  "Create a new terminal session",
  {
    name: z.string().describe("Session name"),
    command: z.string().describe("Shell command to run (e.g. 'bash', 'python3', 'npm run dev')"),
    directory: z.string().optional().describe("Working directory (defaults to server cwd)"),
    tags: z.array(z.string()).optional().describe("Tags for filtering"),
    auto_start: z.boolean().optional().describe("Start immediately after creation"),
  },
  async ({ name, command, directory, tags, auto_start }) => {
    const data = await apiDo({ action: "create", session: name, command, directory, tags, auto_start });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "aterm_run",
  "Send a command to a terminal session and return the output. Waits for completion or timeout.",
  {
    session: z.string().describe("Session name or ID"),
    input: z.string().describe("Command to run"),
    wait_until: z.string().optional().describe("Regex pattern to wait for in output"),
    timeout: z.number().optional().describe("Timeout in seconds (default: 30)"),
    output_mode: z.enum(["raw", "clean", "summary", "structured", "delta"]).optional()
      .describe("Output distillation mode (default: clean)"),
    include_marks: z.boolean().optional().describe("Include numbered output marks"),
    include_advanced: z.boolean().optional().describe("Include PID, uptime, state confidence"),
  },
  async (args) => {
    const data = await apiDo({ action: "run", ...args });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "aterm_read",
  "Read current output from a terminal session with optional distillation",
  {
    session: z.string().describe("Session name or ID"),
    output_mode: z.enum(["raw", "clean", "summary", "structured", "delta"]).optional()
      .describe("Output distillation mode (default: clean)"),
    lines: z.number().optional().describe("Max lines for summary mode (default: 50)"),
    include_marks: z.boolean().optional().describe("Include numbered output marks"),
    include_advanced: z.boolean().optional().describe("Include reduction stats and state confidence"),
  },
  async (args) => {
    const data = await apiDo({ action: "read", ...args });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "aterm_start",
  "Start a stopped terminal session",
  { session: z.string().describe("Session name or ID") },
  async ({ session }) => {
    const data = await apiDo({ action: "start", session });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "aterm_stop",
  "Stop a running terminal session",
  { session: z.string().describe("Session name or ID") },
  async ({ session }) => {
    const data = await apiDo({ action: "stop", session });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "aterm_cancel",
  "Send Ctrl+C (interrupt) to a terminal session",
  { session: z.string().describe("Session name or ID") },
  async ({ session }) => {
    const data = await apiDo({ action: "cancel", session });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "aterm_answer",
  "Reply to a terminal prompt that is waiting for input (e.g. y/n, password)",
  {
    session: z.string().describe("Session name or ID"),
    input: z.string().describe("Response to the prompt"),
  },
  async ({ session, input }) => {
    const data = await apiDo({ action: "answer", session, input });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "aterm_delete",
  "Delete a terminal session permanently",
  { session: z.string().describe("Session name or ID") },
  async ({ session }) => {
    const data = await apiDo({ action: "delete", session });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "aterm_note",
  "Read or write a session's scratchpad (persistent working memory)",
  {
    session: z.string().describe("Session name or ID"),
    content: z.string().optional().describe("Text to write (omit to read current scratchpad)"),
  },
  async ({ session, content }) => {
    const data = await apiDo({ action: "note", session, input: content });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "aterm_search",
  "Search scrollback across all terminal sessions",
  { query: z.string().describe("Regex pattern to search for") },
  async ({ query }) => {
    const data = await apiDo({ action: "search", input: query });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "aterm_history",
  "Get command history for a terminal session",
  {
    session: z.string().describe("Session name or ID"),
    limit: z.number().optional().describe("Max commands to return (default: 50)"),
  },
  async ({ session, limit }) => {
    const data = await apiDo({ action: "history", session, lines: limit });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "aterm_broadcast",
  "Send the same input to multiple terminal sessions simultaneously",
  {
    input: z.string().describe("Command to send to all sessions"),
    sessions: z.array(z.string()).optional().describe("Session names/IDs (default: all ready sessions)"),
  },
  async ({ input, sessions }) => {
    const data = await apiDo({ action: "broadcast", input, sessions });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// ---------------------------------------------------------------------------
// Start MCP server on stdio
server.tool(
  "aterm_bridge",
  "Control the browser through Open Anvil. Simplified actions: navigate (go to URL), read (get page content), click (click element), type (type text), screenshot (capture page), list_tabs, find (search elements), wait (wait for element). Or pass any of the 47 Anvil tools by name.",
  {
    tool: z.string().describe("Tool or action name: navigate, read, click, type, screenshot, list_tabs, find, wait, or any Anvil tool"),
    args: z.string().optional().describe("JSON string of tool arguments, or a simple value (URL for navigate, selector for click)"),
  },
  async ({ tool, args }) => {
    let parsedArgs: Record<string, any> = {};
    if (args) {
      try { parsedArgs = JSON.parse(args); } catch {
        // Simple value — infer based on tool
        if (tool === "navigate") parsedArgs = { url: args };
        else if (tool === "click") parsedArgs = { selector: args };
        else if (tool === "find") parsedArgs = { query: args };
        else if (tool === "wait") parsedArgs = { selector: args };
      }
    }
    const data = await apiDo({ action: "bridge", input: tool, directory: JSON.stringify(parsedArgs) });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// ---------------------------------------------------------------------------
async function main() {
  const transportType = process.env.ATERM_MCP_TRANSPORT ?? "stdio";

  if (transportType === "http") {
    const { StreamableHTTPServerTransport } = await import("@modelcontextprotocol/sdk/server/streamableHttp.js");
    const { createServer } = await import("node:http");
    const { randomUUID } = await import("node:crypto");

    const port = parseInt(process.env.ATERM_MCP_PORT ?? "9601", 10);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    const httpServer = createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
      if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = Buffer.concat(chunks).toString();
      await transport.handleRequest(req, res, body ? JSON.parse(body) : undefined);
    });

    await server.connect(transport);
    httpServer.listen(port);
    console.error(`ATerm MCP server (Streamable HTTP) on port ${port}`);
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch((err) => {
  console.error("ATerm MCP server error:", err);
  console.error("Is the ATerm HTTP server running?");
  process.exit(1);
});
