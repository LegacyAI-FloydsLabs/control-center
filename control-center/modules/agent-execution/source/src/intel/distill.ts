/**
 * Output Distillation — 5 modes for terminal output delivery.
 *
 * The core of the token economy: agents don't need 500 lines of npm install
 * output. They need 5 lines of signal.
 *
 * Modes:
 *   raw       — pass-through (0% reduction)
 *   clean     — ANSI stripped (~10% reduction)
 *   summary   — noise removed, meaningful lines only (~60% reduction)
 *   structured — typed command→output segments (~70% reduction)
 *   delta     — only new content since consumer's last read (variable)
 */

import { Scrollback } from "../pty/scrollback.js";
import { stripAnsi } from "./ansi.js";

export type DistillMode = "raw" | "clean" | "summary" | "structured" | "delta";

export interface StructuredSegment {
  type: "command" | "output" | "error" | "prompt" | "progress";
  text: string;
  lines: number;
}

export interface DistilledOutput {
  mode: DistillMode;
  content: string;
  segments?: StructuredSegment[];
  /** Original byte count before distillation */
  originalBytes: number;
  /** Distilled byte count */
  distilledBytes: number;
  /** Reduction percentage */
  reductionPct: number;
}

// ---------------------------------------------------------------------------
// Noise patterns — lines that carry no signal for agents
// ---------------------------------------------------------------------------
const NOISE_PATTERNS: RegExp[] = [
  // Progress bars and spinners (match lines starting with these chars, not full-line only)
  /^[\s]*[\u2800-\u28FF⸩⸨|\\\/-]/, // Braille spinners, parens spinners
  /[░▒▓█▏▎▍▌▋▊▉]{3,}/, // Block-char progress bars (3+ consecutive)
  /^\s*[\-=]{5,}[>|]/, // ASCII progress bars like [=====>   ]
  // Repeated blank lines (keep 1)
  /^[\s]*$/,
  // npm/yarn timing lines
  /^[\s]*\d+\.\d+s[\s]*$/,
  // Git progress (remote: Counting objects, Receiving, Resolving)
  /^remote: (?:Counting|Compressing|Receiving|Resolving)/,
  // Webpack/bundler progress percentages on same line
  /^[\s]*\d+%[\s]+/,
  // Cargo download progress
  /^\s*Downloaded \d+ crate/,
  // pip install progress
  /^\s*Downloading .+\.whl/,
];

// Error indicators — lines that are always signal
const ERROR_INDICATORS: RegExp[] = [
  /error/i,
  /Error/,
  /^FAIL/,
  /^FATAL/i,
  /warning:/i,
  /Warning:/,
  /panic/i,
  /traceback/i,
  /exception/i,
  /segfault/i,
  /^npm ERR!/,
  /^\s*at\s+/,  // Stack trace lines
  /^\s*-->/,    // Rust error pointers
  /^\s*\^/,     // Caret error indicators
];

// ---------------------------------------------------------------------------
// Distillation functions
// ---------------------------------------------------------------------------


function isNoise(line: string): boolean {
  return NOISE_PATTERNS.some((p) => p.test(line));
}

function isSignal(line: string): boolean {
  return ERROR_INDICATORS.some((p) => p.test(line));
}

/** Mode: clean — strip ANSI, nothing else */
function distillClean(raw: string): string {
  return stripAnsi(raw);
}

/**
 * Mode: summary — remove noise, keep signal, deduplicate blanks.
 * Configurable max lines.
 */
function distillSummary(raw: string, maxLines = 50): string {
  const clean = stripAnsi(raw);
  const lines = clean.split("\n");
  const kept: string[] = [];
  let lastWasBlank = false;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    // Always keep signal lines (errors, warnings)
    if (isSignal(trimmed)) {
      kept.push(trimmed);
      lastWasBlank = false;
      continue;
    }

    // Skip noise
    if (isNoise(trimmed)) {
      continue;
    }

    // Deduplicate blank lines
    if (trimmed === "") {
      if (!lastWasBlank) {
        kept.push("");
        lastWasBlank = true;
      }
      continue;
    }

    kept.push(trimmed);
    lastWasBlank = false;
  }

  // Return last maxLines
  return kept.slice(-maxLines).join("\n");
}

/**
 * Mode: structured — parse into typed segments based on prompt detection.
 * Uses simple heuristic: lines starting with common prompt patterns
 * delimit command segments.
 */
const PROMPT_LINE_RE = /^(?:[^$#❯➜λ→]*[$#❯➜λ→]\s|>>>\s|In \[\d+\]:\s)/;
const ERROR_LINE_RE = /(?:error|Error|ERROR|FAIL|FATAL|traceback|panic|exception)/i;

function distillStructured(raw: string): StructuredSegment[] {
  const clean = stripAnsi(raw);
  const lines = clean.split("\n");
  const segments: StructuredSegment[] = [];
  let current: StructuredSegment | null = null;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (PROMPT_LINE_RE.test(trimmed) && trimmed.length < 200) {
      // Flush previous segment
      if (current) segments.push(current);

      // If the prompt line has content after the prompt character, it's a command
      const afterPrompt = trimmed.replace(PROMPT_LINE_RE, "").trim();
      if (afterPrompt.length > 0) {
        current = { type: "command", text: afterPrompt, lines: 1 };
      } else {
        current = { type: "prompt", text: trimmed, lines: 1 };
      }
    } else if (current) {
      // Classify continuation lines
      if (current.type === "command" && current.lines === 1) {
        // First line after command — flush command, start output or error
        segments.push(current);
        const isErr = ERROR_LINE_RE.test(trimmed);
        current = {
          type: isErr ? "error" : "output",
          text: trimmed,
          lines: 1,
        };
      } else {
        // Continue current segment
        if (current.type === "output" && ERROR_LINE_RE.test(trimmed)) {
          // Transition from output to error within same block
          segments.push(current);
          current = { type: "error", text: trimmed, lines: 1 };
        } else {
          current.text += "\n" + trimmed;
          current.lines++;
        }
      }
    } else {
      // No current segment — start output
      const isErr = ERROR_LINE_RE.test(trimmed);
      current = {
        type: isErr ? "error" : "output",
        text: trimmed,
        lines: 1,
      };
    }
  }
  if (current) segments.push(current);

  return segments;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function distill(
  scrollback: Scrollback,
  mode: DistillMode,
  options: {
    consumerId?: string;
    maxLines?: number;
  } = {},
): DistilledOutput {
  const raw = mode === "delta" && options.consumerId
    ? scrollback.delta(options.consumerId)
    : scrollback.raw();

  const originalBytes = raw.length;
  let content: string;
  let segments: StructuredSegment[] | undefined;

  switch (mode) {
    case "raw":
      content = raw;
      break;
    case "clean":
      content = distillClean(raw);
      break;
    case "summary":
      content = distillSummary(raw, options.maxLines ?? 50);
      break;
    case "structured": {
      segments = distillStructured(raw);
      content = segments
        .map((s) => `[${s.type}] ${s.text}`)
        .join("\n---\n");
      break;
    }
    case "delta":
      content = stripAnsi(raw);
      break;
    default:
      content = raw;
  }

  const distilledBytes = content.length;
  const reductionPct = originalBytes > 0
    ? Math.round((1 - distilledBytes / originalBytes) * 100)
    : 0;

  return {
    mode,
    content,
    segments,
    originalBytes,
    distilledBytes,
    reductionPct,
  };
}
