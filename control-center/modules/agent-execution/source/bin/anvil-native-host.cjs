#!/usr/bin/env node

/**
 * ATerm Native Messaging Host
 *
 * Bridges Chrome Native Messaging (stdio) to the Anvil MCP WebSocket server.
 * This enables the Open Anvil Chrome extension to communicate with ATerm
 * via native messaging when the WebSocket channel is unavailable.
 *
 * Chrome → Native Messaging (stdio) → This Host → WebSocket (127.0.0.1:7777) → Anvil MCP
 *
 * IMPORTANT: This file MUST use CommonJS (require) because Chrome native messaging
 * hosts run as standalone processes without ESM import resolution from the project.
 * The .cjs extension ensures Node treats this as CommonJS regardless of package.json type.
 */

const ANVIL_WS_URL = process.env.ANVIL_WS_URL ?? "ws://127.0.0.1:7777";

let ws = null;
let connectionReady = false;
let WebSocket = null;

// Load ws module — resolve from the project's node_modules
try {
  const path = require("path");
  const wsPath = path.join(__dirname, "..", "node_modules", "ws", "index.js");
  WebSocket = require(wsPath);
} catch {
  try {
    WebSocket = require("ws");
  } catch (e) {
    console.error("[ATermNativeHost] Cannot load ws module:", e.message);
    console.error("[ATermNativeHost] Native messaging will not work without ws installed");
  }
}

function connectToMCP() {
  return new Promise((resolve, reject) => {
    if (!WebSocket) {
      reject(new Error("ws module not available"));
      return;
    }

    ws = new WebSocket(ANVIL_WS_URL);

    ws.on("open", () => {
      console.error("[ATermNativeHost] Connected to Anvil MCP at", ANVIL_WS_URL);
      connectionReady = true;
      resolve();
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        sendNativeMessage(message);
      } catch (e) {
        console.error("[ATermNativeHost] Error parsing WS message:", e);
      }
    });

    ws.on("error", (error) => {
      console.error("[ATermNativeHost] WebSocket error:", error.message);
      if (!connectionReady) reject(error);
    });

    ws.on("close", () => {
      console.error("[ATermNativeHost] WebSocket closed");
      connectionReady = false;
    });

    setTimeout(() => {
      if (!connectionReady) reject(new Error("Connection timeout"));
    }, 5000);
  });
}

function sendNativeMessage(message) {
  const messageStr = JSON.stringify(message);
  const buffer = Buffer.from(messageStr, "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);
  process.stdout.write(header);
  process.stdout.write(buffer);
}

let messageLength = null;
let inputBuffer = Buffer.alloc(0);

process.stdin.on("readable", () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    inputBuffer = Buffer.concat([inputBuffer, chunk]);

    while (true) {
      if (messageLength === null) {
        if (inputBuffer.length >= 4) {
          messageLength = inputBuffer.readUInt32LE(0);
          inputBuffer = inputBuffer.slice(4);
        } else {
          break;
        }
      }

      if (messageLength !== null) {
        if (inputBuffer.length >= messageLength) {
          const messageBuffer = inputBuffer.slice(0, messageLength);
          inputBuffer = inputBuffer.slice(messageLength);
          messageLength = null;

          try {
            const message = JSON.parse(messageBuffer.toString());
            handleChromeMessage(message);
          } catch (e) {
            console.error("[ATermNativeHost] Error parsing Chrome message:", e);
          }
        } else {
          break;
        }
      }
    }
  }
});

function handleChromeMessage(message) {
  if (!connectionReady || !ws || ws.readyState !== WebSocket.OPEN) {
    sendNativeMessage({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Not connected to Anvil MCP server" },
      id: message.id ?? null,
    });
    return;
  }

  try {
    ws.send(JSON.stringify(message));
  } catch (e) {
    console.error("[ATermNativeHost] Error sending to WS:", e);
    sendNativeMessage({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Failed to send to MCP server" },
      id: message.id ?? null,
    });
  }
}

console.error("[ATermNativeHost] Starting ATerm Native Messaging Host...");

connectToMCP().catch((error) => {
  console.error("[ATermNativeHost] Could not connect to Anvil MCP:", error.message);
  console.error("[ATermNativeHost] Host will respond with errors until server is available");
});

process.on("SIGINT", () => {
  if (ws) ws.close();
  process.exit(0);
});
