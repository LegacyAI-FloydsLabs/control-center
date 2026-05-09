/**
 * aterm.yml — Declarative workspace configuration.
 *
 * Define sessions, layout, automation in YAML. Load on startup.
 * This is how I define my workspace once and reproduce it every time.
 *
 * Example aterm.yml:
 *
 *   sessions:
 *     - name: build
 *       command: npm run dev
 *       directory: /home/user/project
 *       tags: [dev, frontend]
 *       auto_start: true
 *       order: 1
 *
 *     - name: tests
 *       command: npm test -- --watch
 *       directory: /home/user/project
 *       tags: [dev, test]
 *       auto_start: true
 *       order: 2
 *
 *     - name: deploy
 *       command: bash
 *       directory: /home/user/project
 *       tags: [ops]
 *       order: 3
 *
 *   layout: 2x1
 *
 *   automation:
 *     - session: build
 *       type: keepalive
 *     - session: tests
 *       type: hook
 *       watch_path: /home/user/project/src
 */
import fs from "node:fs";
import path from "node:path";
import type { SessionConfig, AutomationType } from "./model.js";

/** Parsed aterm.yml structure */
export interface AtermConfig {
  sessions: SessionConfig[];
  layout?: string;
}

/**
 * Parse an aterm.yml file into session configs.
 * Uses a simple YAML subset parser — no dependency needed for this structure.
 */
export function loadAtermConfig(filePath: string): AtermConfig {
  const raw = fs.readFileSync(filePath, "utf-8");
  return parseAtermYaml(raw);
}

/**
 * Try to find and load aterm.yml from standard locations.
 * Search order: CLI arg, cwd, home directory.
 */
export function findAndLoadConfig(explicitPath?: string): AtermConfig | null {
  const candidates = [
    explicitPath,
    path.join(process.cwd(), "aterm.yml"),
    path.join(process.cwd(), "aterm.yaml"),
    path.join(process.env.HOME ?? "/tmp", ".aterm.yml"),
    path.join(process.env.HOME ?? "/tmp", ".aterm.yaml"),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        return loadAtermConfig(p);
      } catch (e: any) {
        console.error(`Failed to parse ${p}: ${e.message}`);
      }
    }
  }
  return null;
}

/**
 * Minimal YAML parser for aterm.yml structure.
 * Handles the specific shapes we need without pulling in a YAML library.
 * Supports: scalars, arrays (inline [...] and block - item), nested objects, env var substitution.
 */
function parseAtermYaml(raw: string): AtermConfig {
  // Substitute environment variables: ${VAR} or ${VAR:-default}
  const substituted = raw.replace(/\$\{(\w+)(?::-([^}]*))?\}/g, (_match, varName, defaultVal) => {
    return process.env[varName] ?? defaultVal ?? "";
  });

  const lines = substituted.split("\n");
  const sessions: SessionConfig[] = [];
  let layout: string | undefined;
  let currentSession: Partial<SessionConfig> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trimEnd();

    // Skip comments and blank lines
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    // Top-level keys
    if (!line.startsWith(" ") && !line.startsWith("\t")) {
      // Flush current session
      if (currentSession?.name && currentSession?.command) {
        sessions.push(buildSessionConfig(currentSession));
        currentSession = null;
      }

      if (trimmed.startsWith("layout:")) {
        layout = trimmed.replace("layout:", "").trim();
      }
      // "sessions:" header — just marks the section, handled by list items below
      continue;
    }

    // List item start (- name: value)
    const listMatch = trimmed.match(/^[\s]*-\s+(.*)/);
    if (listMatch) {
      // Flush previous session
      if (currentSession?.name && currentSession?.command) {
        sessions.push(buildSessionConfig(currentSession));
      }
      currentSession = {};
      // Parse the key: value on the same line as the dash
      const kv = listMatch[1]!;
      parseKV(kv, currentSession);
      continue;
    }

    // Continuation of a list item (indented key: value)
    if (currentSession) {
      parseKV(trimmed.trim(), currentSession);
    }
  }

  // Flush last session
  if (currentSession?.name && currentSession?.command) {
    sessions.push(buildSessionConfig(currentSession));
  }

  return { sessions, layout };
}

function parseKV(kv: string, target: Record<string, any>): void {
  const colonIdx = kv.indexOf(":");
  if (colonIdx === -1) return;

  const key = kv.slice(0, colonIdx).trim();
  const val = kv.slice(colonIdx + 1).trim();

  switch (key) {
    case "name": target.name = val; break;
    case "command": target.command = val; break;
    case "directory": target.directory = val; break;
    case "label": target.label = val; break;
    case "order": target.order = parseInt(val, 10) || 0; break;
    case "pinned": target.pinned = val === "true"; break;
    case "auto_start": target.autoStart = val === "true"; break;
    case "auto_restart": target.autoRestart = val === "true"; break;
    case "automation": {
      // Parse automation: {type: cron, cronExpression: "*/1 * * * *"}
      // Handles relaxed YAML inline syntax (unquoted keys, optionally quoted values)
      if (val.startsWith("{")) {
        const auto = parseRelaxedInlineObject(val);
        if (auto) {
          target.automation = {
            type: (auto.type ?? "none") as AutomationType,
            interval: auto.interval ? Number(auto.interval) : undefined,
            watchPath: auto.watchPath ?? auto.watch_path,
            cronExpression: auto.cronExpression ?? auto.cron_expression,
          };
        }
      }
      break;
    }
    case "tags":
      // Support both [a, b] and block list
      if (val.startsWith("[")) {
        target.tags = val.replace(/[\[\]]/g, "").split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      break;
    case "env":
      // Inline env: {KEY: VAL, KEY2: VAL2}
      if (val.startsWith("{")) {
        const pairs = val.replace(/[{}]/g, "").split(",");
        target.env = {};
        for (const pair of pairs) {
          const [k, v] = pair.split(":").map((s: string) => s.trim());
          if (k && v) target.env[k] = v;
        }
      }
      break;
  }
}

function buildSessionConfig(partial: Partial<SessionConfig>): SessionConfig {
  return {
    name: partial.name!,
    command: partial.command!,
    directory: partial.directory ?? process.cwd(),
    label: partial.label,
    tags: partial.tags,
    order: partial.order,
    pinned: partial.pinned,
    autoStart: partial.autoStart,
    autoRestart: partial.autoRestart,
    automation: partial.automation,
  };
}

/**
 * Import sessions from TCC's agents.json format.
 */
export function loadTccAgentsJson(filePath: string): Record<string, any> {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}


/**
 * Parse a relaxed inline YAML object like {type: cron, cronExpression: "\u002A/1 * * * *"}
 * Handles unquoted keys and optionally quoted values.
 * Returns null if parsing fails.
 */
function parseRelaxedInlineObject(val: string): Record<string, string> | null {
  const inner = val.replace(/^\{/, "").replace(/\}$/, "").trim();
  if (!inner) return {};

  const result: Record<string, string> = {};
  // Split by comma — but respect quoted strings
  const pairs: string[] = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]!;
    if (ch === '"' && (i === 0 || inner[i - 1] !== '\\')) {
      inQuote = !inQuote;
      current += ch;
    } else if (ch === ',' && !inQuote) {
      pairs.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) pairs.push(current.trim());

  for (const pair of pairs) {
    const colonIdx = pair.indexOf(':');
    if (colonIdx === -1) continue;
    const key = pair.slice(0, colonIdx).trim();
    let value = pair.slice(colonIdx + 1).trim();
    // Strip surrounding quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return Object.keys(result).length > 0 ? result : null;
}