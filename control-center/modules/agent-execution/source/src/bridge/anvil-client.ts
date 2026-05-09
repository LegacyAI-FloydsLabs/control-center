/**
 * Anvil Bridge Client — lifecycle-managed connection to Open Anvil MCP server.
 *
 * CRITICAL DISCOVERY (metacog analysis):
 *   Anvil's mcpResult() ALWAYS writes to stdout, even for WS-sourced requests.
 *   mcpResponseRouting tracks the source but is never used for output routing.
 *   Therefore: ATerm must communicate via stdio (stdin/stdout), NOT WebSocket.
 *   WebSocket is for the Chrome extension only.
 *
 * This matches how pi operates: spawn server, pipe MCP JSON-RPC on stdin/stdout.
 *
 * Architecture:
 *   ATerm (stdin→stdout) ←→ Anvil server.js (WS:7778) ←→ Chrome extension → browser
 *
 * Handles what every agent gets wrong:
 *   1. Spawns the Anvil server and keeps stdin alive (server exits on stdin close)
 *   2. Communicates via stdio JSON-RPC (not WebSocket — see discovery above)
 *   3. Checks extension connection by probing with list_tabs
 *   4. Returns actionable error messages, not "Extension not connected"
 *   5. Auto-waits after navigation for SPA content
 *   6. Lazy-initialized: no cost until first bridge call
 *   7. Singleton per ATerm server lifetime
 *   8. Kills stale port 7778 processes before spawning
 */
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { createInterface, type Interface } from "node:readline";
import fs from "node:fs";

const ANVIL_SERVER_PATH = process.env.ANVIL_SERVER_PATH
  ?? "/Volumes/SanDisk1Tb/open-anvil/mcp-server/server.js";

const ANVIL_WS_PORT = process.env.ANVIL_WS_PORT ?? "7777";
const TOOL_TIMEOUT = parseInt(process.env.ANVIL_TIMEOUT ?? "30000", 10);

/** Simplified bridge actions for Tier 1/2 agents */
const SIMPLE_ACTION_MAP: Record<string, { tool: string; defaults?: Record<string, any> }> = {
  navigate: { tool: "navigate_to" },
  read: { tool: "read_page", defaults: { max_chars: 4000 } },
  click: { tool: "click_element" },
  type: { tool: "type_text" },
  screenshot: { tool: "take_screenshot" },
  list_tabs: { tool: "list_tabs" },
  find: { tool: "find_elements" },
  wait: { tool: "wait_for_element", defaults: { timeout: 10000 } },
};

export interface BridgeCallResult {
  ok: boolean;
  result?: any;
  error?: string;
  hint?: string;
  anvil_connected: boolean;
  extension_connected: boolean;
}

interface PendingRequest {
  resolve: (value: any) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class AnvilBridgeClient extends EventEmitter {
  private serverProcess: ChildProcess | null = null;
  private stdout: Interface | null = null;
  private pending = new Map<string, PendingRequest>();
  private requestId = 0;
  private initialized = false;
  private connecting = false;
  private startAttempts = 0;

  /** Lazy init — call before any tool invocation */
  async ensureConnected(): Promise<{ ok: boolean; hint?: string }> {
    if (this.serverProcess && this.serverProcess.exitCode === null && this.initialized) {
      return { ok: true };
    }

    if (this.connecting) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (this.initialized) {
            clearInterval(check);
            resolve({ ok: true });
          }
        }, 200);
        setTimeout(() => { clearInterval(check); resolve({ ok: false, hint: "Connection timed out." }); }, 15000);
      });
    }

    this.connecting = true;

    // Check server.js exists
    if (!fs.existsSync(ANVIL_SERVER_PATH)) {
      this.connecting = false;
      return { ok: false, hint: `Open Anvil not found at ${ANVIL_SERVER_PATH}. Set ANVIL_SERVER_PATH.` };
    }

    // Kill stale process on the Anvil WS port
    try {
      const pid = execSync(`lsof -ti :${ANVIL_WS_PORT} 2>/dev/null`).toString().trim();
      if (pid) {
        execSync(`kill ${pid} 2>/dev/null`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch { /* no stale process */ }

    // Spawn server
    try {
      this._spawnServer();
    } catch (err: any) {
      this.connecting = false;
      return { ok: false, hint: `Failed to start Anvil: ${err.message}` };
    }

    // Wait for server to start
    await new Promise((r) => setTimeout(r, 2000));

    // Initialize MCP
    try {
      await this._initialize();
    } catch (err: any) {
      this.connecting = false;
      return { ok: false, hint: `MCP init failed: ${err.message}` };
    }

    this.connecting = false;
    return { ok: true };
  }

  /**
   * Call an Anvil tool.
   *
   * Simplified actions (navigate, read, click, type, screenshot):
   *   Translated to Anvil tool names. Navigate auto-waits for SPA content.
   *
   * Raw Anvil tools (navigate_to, distill_dom, perceive, etc.):
   *   Passed through directly.
   */
  async callTool(actionOrTool: string, args: Record<string, any> = {}): Promise<BridgeCallResult> {
    const conn = await this.ensureConnected();
    if (!conn.ok) {
      return { ok: false, error: "Anvil not connected", hint: conn.hint, anvil_connected: false, extension_connected: false };
    }

    // Translate simplified actions
    const mapping = SIMPLE_ACTION_MAP[actionOrTool];
    const actualTool = mapping?.tool ?? actionOrTool;
    const actualArgs = mapping ? { ...mapping.defaults, ...args } : args;

    // Call the tool via stdio
    let result: any;
    try {
      result = await this._callTool(actualTool, actualArgs);
    } catch (err: any) {
      return { ok: false, error: err.message, anvil_connected: true, extension_connected: false };
    }

    // Check extension connection
    if (result.error?.includes("Extension not connected") || result.error?.includes("extension not connected")) {
      return {
        ok: false,
        error: "Chrome extension not connected to Anvil",
        hint: "Open Chrome, click the Open Anvil extension, and press its reset button. It will connect to ws://127.0.0.1:" + ANVIL_WS_PORT,
        anvil_connected: true,
        extension_connected: false,
      };
    }

    // For navigate: auto-wait for SPA content (best-effort, non-blocking)
    if (actionOrTool === "navigate" && result.success !== false) {
      try {
        await this._callTool("wait_for_element", {
          selector: "h1, article, main, [role='main'], #root, #app, body > div",
          timeout: 5000,
        });
      } catch { /* best-effort — page may be static or use unusual selectors */ }
    }

    return {
      ok: result.success !== false,
      result: result.result ?? result,
      error: result.error,
      anvil_connected: true,
      extension_connected: true,
    };
  }

  /** Check extension connection by probing with list_tabs */
  async checkExtension(): Promise<boolean> {
    const conn = await this.ensureConnected();
    if (!conn.ok) return false;
    try {
      const result = await this._callTool("list_tabs", {});
      return result.success !== false;
    } catch {
      return false;
    }
  }

  get status(): { server: boolean; initialized: boolean } {
    return {
      server: this.serverProcess !== null && this.serverProcess.exitCode === null,
      initialized: this.initialized,
    };
  }

  destroy(): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.resolve({ success: false, error: "Bridge shutting down" });
    }
    this.pending.clear();

    if (this.serverProcess && this.serverProcess.exitCode === null) {
      // Close stdin — server will exit via rl.on('close')
      this.serverProcess.stdin?.end();
      // Escalate after 3s
      setTimeout(() => {
        if (this.serverProcess?.exitCode === null) {
          this.serverProcess?.kill("SIGKILL");
        }
      }, 3000);
    }
    this.stdout?.close();
    this.stdout = null;
    this.serverProcess = null;
    this.initialized = false;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _spawnServer(): void {
    if (this.startAttempts >= 3) {
      throw new Error("Anvil server failed to start after 3 attempts");
    }
    this.startAttempts++;

    const server = spawn("node", [ANVIL_SERVER_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        MCP_TRANSPORT: "stdio",
        ANVIL_WS_PORT,
        ANVIL_DEBUG: "true",
      },
    });

    // Parse stdout for JSON-RPC responses
    this.stdout = createInterface({ input: server.stdout!, terminal: false });
    this.stdout.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const msg = JSON.parse(trimmed);
        if (msg.id && this.pending.has(String(msg.id))) {
          const p = this.pending.get(String(msg.id))!;
          clearTimeout(p.timer);
          this.pending.delete(String(msg.id));
          if (msg.error) {
            p.resolve({ success: false, error: msg.error.message ?? JSON.stringify(msg.error) });
          } else {
            p.resolve(msg.result);
          }
        }
      } catch { /* not JSON — ignore */ }
    });

    // Log stderr for diagnostics
    server.stderr?.on("data", (data: Buffer) => {
      this.emit("log", data.toString().trim());
    });

    server.on("exit", (code) => {
      this.emit("server-exit", code);
      this.serverProcess = null;
      this.initialized = false;
    });

    server.on("error", (err) => {
      this.emit("error", err);
    });

    this.serverProcess = server;
  }

  private async _initialize(): Promise<void> {
    const result = await this._sendRpc("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "aterm-bridge", version: "0.1.0" },
    });

    if (!result?.protocolVersion) {
      throw new Error("MCP initialize did not return protocolVersion");
    }

    // Send initialized notification (no response expected)
    this._writeStdin({ jsonrpc: "2.0", method: "notifications/initialized" });

    this.initialized = true;
    this.startAttempts = 0;
  }

  private async _callTool(toolName: string, args: Record<string, any>): Promise<any> {
    const result = await this._sendRpc("tools/call", { name: toolName, arguments: args });

    // Parse double-serialized response
    if (result?.content?.[0]?.type === "text") {
      try {
        return JSON.parse(result.content[0].text);
      } catch {
        return result;
      }
    }
    return result;
  }

  private _sendRpc(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.serverProcess || this.serverProcess.exitCode !== null) {
        reject(new Error("Anvil server not running"));
        return;
      }

      const id = `aterm_${++this.requestId}_${Date.now()}`;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Anvil RPC timeout: ${method} (${TOOL_TIMEOUT}ms)`));
      }, TOOL_TIMEOUT);

      this.pending.set(id, { resolve, timer });
      this._writeStdin({ jsonrpc: "2.0", id, method, params });
    });
  }

  private _writeStdin(data: object): void {
    if (this.serverProcess?.stdin?.writable) {
      this.serverProcess.stdin.write(JSON.stringify(data) + "\n");
    }
  }
}

// Singleton
let _instance: AnvilBridgeClient | null = null;

export function getBridgeClient(): AnvilBridgeClient {
  if (!_instance) {
    _instance = new AnvilBridgeClient();
  }
  return _instance;
}

export function destroyBridgeClient(): void {
  _instance?.destroy();
  _instance = null;
}
