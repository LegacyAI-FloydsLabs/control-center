/**
 * Output Marks — numbered anchors on terminal output segments.
 *
 * Marks let agents point at things precisely:
 *   "fix mark 3" instead of "the type error around line 42 of the output"
 *
 * Mark boundaries are determined by command tracking:
 *   - A command was sent → output arrives → next prompt appears = one mark
 *   - This avoids the false-positive problem of pattern-only detection
 *
 * Each mark has a stable ref ID that persists across scrollback growth.
 */

const ANSI_RE = /(?:\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()][A-Za-z0-9]|\x1b[^[(\]0-9]|\x0d)/g;

// Prompt patterns for mark boundary detection (matches start of a new prompt line)
const PROMPT_BOUNDARY_RE = /^(?:[^$#\u276f\u279c\u03bb\u2192]*[$#\u276f\u279c\u03bb\u2192]\s?|>>>\s?|In \[\d+\]:\s?)/;
const ERROR_IN_MARK_RE = /(?:error|Error|ERROR|FAIL|FATAL|traceback|Traceback|panic|exception)/i;

export type MarkType = "command" | "output" | "error" | "prompt";

export interface OutputMark {
  /** Sequential mark number (1-based, for human reference) */
  id: number;
  /** Stable ref that persists across scrollback growth */
  ref: string;
  /** What kind of content this mark contains */
  type: MarkType;
  /** Clean text content of this mark */
  text: string;
  /** Number of lines in this mark */
  lines: number;
  /** Byte offset into the scrollback where this mark starts */
  startOffset: number;
}

function stableRef(startOffset: number, text: string): string {
  let hash = 2166136261;
  const input = `${startOffset}:${text}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `r${(hash >>> 0).toString(16)}`;
}

/**
 * Build marks from terminal output using command-tracking boundaries.
 *
 * Strategy:
 *   1. Split output into lines
 *   2. Identify prompt lines (mark boundaries)
 *   3. Group lines between prompts into marks
 *   4. Classify each mark (command, output, error, prompt)
 */
export function buildMarks(rawOutput: string): OutputMark[] {
  const clean = rawOutput.replace(ANSI_RE, "");
  const lines = clean.split("\n");
  const marks: OutputMark[] = [];

  let currentLines: string[] = [];
  let currentStartOffset = 0;
  let byteOffset = 0;
  let markId = 1;

  function flushLines(lineBuf: string[], startOff: number): void {
    if (lineBuf.length === 0) return;
    const text = lineBuf.join("\n").trimEnd();
    if (text.length === 0) return;

    let type: MarkType = "output";
    const firstLine = lineBuf[0]?.trim() ?? "";

    if (PROMPT_BOUNDARY_RE.test(firstLine)) {
      const afterPrompt = firstLine.replace(PROMPT_BOUNDARY_RE, "").trim();
      if (afterPrompt.length > 0) {
        type = "command";
      } else {
        type = "prompt";
      }
    }

    // Check if the mark contains errors (only override output, not command/prompt)
    if (type === "output" && ERROR_IN_MARK_RE.test(text)) {
      type = "error";
    }

    marks.push({
      id: markId++,
      ref: stableRef(startOff, text),
      type,
      text,
      lines: lineBuf.length,
      startOffset: startOff,
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trimEnd();

    if (PROMPT_BOUNDARY_RE.test(trimmed)) {
      // Prompt line detected — flush accumulated output lines, then
      // emit the prompt/command line as its own single-line mark
      flushLines(currentLines, currentStartOffset);
      currentLines = [];
      flushLines([trimmed], byteOffset);
    } else {
      if (currentLines.length === 0) {
        currentStartOffset = byteOffset;
      }
      currentLines.push(trimmed);
    }

    byteOffset += line.length + 1;
  }

  // Flush any remaining non-prompt lines
  flushLines(currentLines, currentStartOffset);
  return marks;
}

/**
 * Get a specific mark by ID (1-based).
 */
export function getMark(marks: OutputMark[], id: number): OutputMark | undefined {
  return marks.find((m) => m.id === id);
}

/**
 * Get a mark by its stable ref.
 */
export function getMarkByRef(marks: OutputMark[], ref: string): OutputMark | undefined {
  return marks.find((m) => m.ref === ref);
}

/**
 * Get marks by type.
 */
export function getMarksByType(marks: OutputMark[], type: MarkType): OutputMark[] {
  return marks.filter((m) => m.type === type);
}

/**
 * Format marks for display (the visual overlay humans see).
 */
export function formatMarks(marks: OutputMark[]): string {
  return marks
    .map((m) => {
      const badge = `[${m.id}]`;
      const indented = m.text
        .split("\n")
        .map((l, i) => (i === 0 ? `${badge} ${l}` : `     ${l}`))
        .join("\n");
      return indented;
    })
    .join("\n");
}
