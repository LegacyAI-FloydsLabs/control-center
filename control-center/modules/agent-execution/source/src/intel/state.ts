/**
 * 5-Layer Semantic State Detector
 *
 * Revised architecture from metacognitive analysis (ep_1777056625987_f4nzipfq7).
 * Original design failed all 5 test scenarios due to:
 *   1. Pattern check order (INPUT before PROMPT)
 *   2. No command-tracking context
 *   3. Timing as primary signal
 *
 * Layers (highest to lowest priority):
 *   1. Definitive process signals (exit code, process death)
 *   2. High-confidence: prompt patterns + command tracking
 *   3. Medium-confidence: error/progress patterns + command context
 *   4. Low-confidence: timing heuristics (tiebreaker only)
 *   5. Honest uncertainty: return previous state with low confidence
 *
 * Every result includes: { state, confidence, method, detail }
 * Agents set their own confidence floor.
 */

import {
  PROMPT_PATTERNS,
  INPUT_PATTERNS,
  ERROR_PATTERNS,
  PROGRESS_PATTERNS,
  type Pattern,
} from "./patterns.js";
import { stripAnsi } from "./ansi.js";

export type SessionState =
  | "stopped"
  | "starting"
  | "ready"
  | "busy"
  | "waiting_for_input"
  | "error"
  | "exited";

export type DetectionMethod =
  | "process_exit"
  | "process_spawn"
  | "prompt_pattern"
  | "input_pattern"
  | "error_pattern"
  | "progress_pattern"
  | "timing_heuristic"
  | "no_match";

export interface StateResult {
  state: SessionState;
  confidence: number; // 0-1
  method: DetectionMethod;
  detail: string;
}

export interface CommandContext {
  /** Whether we sent a command to this PTY */
  commandPending: boolean;
  /** What the last command was */
  lastCommandText: string | null;
  /** When the last command was sent (epoch ms) */
  lastCommandSentAt: number | null;
  /** When last output was received (epoch ms) */
  lastOutputAt: number | null;
  /** Whether the process is running */
  processRunning: boolean;
  /** Exit code if process exited */
  exitCode: number | null;
}


function matchFirst(text: string, patterns: Pattern[]): Pattern | null {
  for (const p of patterns) {
    if (p.re.test(text)) return p;
  }
  return null;
}

/** Time since an event in ms, or Infinity if null */
function elapsed(ts: number | null): number {
  if (ts === null) return Infinity;
  return Date.now() - ts;
}

export class StateDetector {
  private previousState: SessionState = "stopped";
  private previousResult: StateResult = {
    state: "stopped",
    confidence: 1.0,
    method: "process_exit",
    detail: "initial state",
  };

  /**
   * Detect the semantic state of a terminal session.
   *
   * @param lastLine - The last line of terminal output (raw)
   * @param recentOutput - Recent output chunk (last ~2KB, raw)
   * @param context - Command tracking context from the PTY pool
   */
  detect(lastLine: string, recentOutput: string, context: CommandContext): StateResult {
    const cleanLine = stripAnsi(lastLine).trim();
    const cleanRecent = stripAnsi(recentOutput);

    // -----------------------------------------------------------------------
    // Layer 1: Definitive process signals
    // -----------------------------------------------------------------------
    if (!context.processRunning && context.exitCode !== null) {
      return this._commit({
        state: "exited",
        confidence: 1.0,
        method: "process_exit",
        detail: `exit code ${context.exitCode}`,
      });
    }
    if (!context.processRunning) {
      return this._commit({
        state: "stopped",
        confidence: 1.0,
        method: "process_exit",
        detail: "process not running",
      });
    }

    // -----------------------------------------------------------------------
    // Layer 2: High-confidence prompt/input patterns WITH command context
    // -----------------------------------------------------------------------

    // If we sent a command and see an input prompt → waiting_for_input
    if (context.commandPending) {
      const inputMatch = matchFirst(cleanLine, INPUT_PATTERNS);
      if (inputMatch) {
        return this._commit({
          state: "waiting_for_input",
          confidence: 0.9,
          method: "input_pattern",
          detail: `${inputMatch.label}: "${cleanLine.slice(-80)}"`,
        });
      }
    }

    // If we see a shell prompt → ready
    // But only if: no command pending, OR command was sent AND output has arrived since
    const promptMatch = matchFirst(cleanLine, PROMPT_PATTERNS);
    if (promptMatch) {
      const outputAfterCommand =
        context.lastCommandSentAt !== null &&
        context.lastOutputAt !== null &&
        context.lastOutputAt > context.lastCommandSentAt;

      if (!context.commandPending || outputAfterCommand) {
        const completedErrorMatch = context.commandPending
          ? matchFirst(cleanRecent, ERROR_PATTERNS)
          : null;
        if (completedErrorMatch) {
          return this._commit({
            state: "error",
            confidence: 0.85,
            method: "error_pattern",
            detail: `${completedErrorMatch.label} (command completed with error)`,
          });
        }
        return this._commit({
          state: "ready",
          confidence: 0.85,
          method: "prompt_pattern",
          detail: `${promptMatch.label}: "${cleanLine.slice(-40)}"`,
        });
      }
    }

    // -----------------------------------------------------------------------
    // Layer 3: Medium-confidence error/progress patterns + command context
    // Only flag as error/progress if a command is pending or was recently sent
    // -----------------------------------------------------------------------
    const commandRecent = elapsed(context.lastCommandSentAt) < 60_000;

    if (context.commandPending || commandRecent) {
      const errorMatch = matchFirst(cleanRecent, ERROR_PATTERNS);
      if (errorMatch) {
        // Check if we also see a prompt on the last line (command finished with error)
        if (promptMatch) {
          return this._commit({
            state: "error",
            confidence: 0.8,
            method: "error_pattern",
            detail: `${errorMatch.label} (command completed with error)`,
          });
        }
        // Error in output, no prompt yet → still busy but with error detected
        return this._commit({
          state: "busy",
          confidence: 0.7,
          method: "error_pattern",
          detail: `${errorMatch.label} (output ongoing)`,
        });
      }

      const progressMatch = matchFirst(cleanRecent, PROGRESS_PATTERNS);
      if (progressMatch) {
        return this._commit({
          state: "busy",
          confidence: 0.75,
          method: "progress_pattern",
          detail: progressMatch.label,
        });
      }
    }

    // -----------------------------------------------------------------------
    // Layer 4: Timing heuristics (tiebreaker only, NEVER primary)
    // -----------------------------------------------------------------------
    if (context.commandPending) {
      const silenceMs = elapsed(context.lastOutputAt);

      // No output for > 30s after command → probably ready (prompt may be hidden)
      if (silenceMs > 30_000) {
        return this._commit({
          state: "ready",
          confidence: 0.4,
          method: "timing_heuristic",
          detail: `${Math.round(silenceMs / 1000)}s silence after command`,
        });
      }

      // Active output within last 2s → busy
      if (silenceMs < 2_000) {
        return this._commit({
          state: "busy",
          confidence: 0.5,
          method: "timing_heuristic",
          detail: "output received recently",
        });
      }
    }

    // -----------------------------------------------------------------------
    // Layer 5: Honest uncertainty
    // -----------------------------------------------------------------------
    // When a command is pending and nothing else matched, assume busy
    if (context.commandPending) {
      return this._commit({
        state: "busy",
        confidence: 0.3,
        method: "no_match",
        detail: "command pending, no pattern matched — assuming busy",
      });
    }
    return this._commit({
      state: this.previousState === "stopped" ? "ready" : this.previousState,
      confidence: 0.3,
      method: "no_match",
      detail: "no pattern matched, returning previous state",
    });
  }

  /** Commit a result and update previous state */
  private _commit(result: StateResult): StateResult {
    this.previousState = result.state;
    this.previousResult = result;
    return result;
  }

  /** Get the last detection result without re-running */
  get lastResult(): StateResult {
    return this.previousResult;
  }

  /** Notify the detector that a process was just spawned */
  notifySpawn(): StateResult {
    return this._commit({
      state: "starting",
      confidence: 1.0,
      method: "process_spawn",
      detail: "process spawned",
    });
  }
}
