/**
 * Shared ANSI escape code utilities.
 *
 * Single source of truth for ANSI stripping — used by both state detection
 * and output distillation. Extracted to eliminate the DRY violation where
 * identical stripAnsi functions existed in both modules.
 */

export const ANSI_RE = /(?:\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()][A-Za-z0-9]|\x1b[^[(\]0-9]|\x0d)/g;

export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}
