/**
 * Ring buffer for terminal scrollback.
 *
 * Stores raw PTY output with configurable max size.
 * Provides ANSI-clean export and byte-range reads.
 * Tracks a per-consumer read cursor for delta reads.
 */

// Strip ANSI escape sequences: CSI (7-bit + 8-bit), OSC, SGR, and other control sequences
const ANSI_RE = /(?:\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()][A-Za-z0-9]|\x1b[^[(\]0-9]|\x0d)/g;

export class Scrollback {
  private buf: string[] = [];
  private totalBytes = 0;
  private readonly maxBytes: number;

  /** Per-consumer read cursors — maps consumerId to byte offset they've read up to */
  private cursors = new Map<string, number>();

  constructor(maxBytes = 256 * 1024) {
    this.maxBytes = maxBytes;
  }

  /** Append raw PTY output chunk */
  append(chunk: string): void {
    this.buf.push(chunk);
    this.totalBytes += chunk.length;

    // Evict oldest chunks when over budget
    while (this.totalBytes > this.maxBytes && this.buf.length > 1) {
      const evicted = this.buf.shift()!;
      this.totalBytes -= evicted.length;
      // Adjust cursors — any cursor pointing into evicted range resets to 0
      for (const [id, cursor] of this.cursors) {
        const adjusted = cursor - evicted.length;
        this.cursors.set(id, Math.max(0, adjusted));
      }
    }
  }

  /** Raw content — full buffer joined */
  raw(): string {
    return this.buf.join("");
  }

  /** ANSI-stripped content */
  clean(): string {
    return this.raw().replace(ANSI_RE, "");
  }

  /** Last N lines of clean output */
  lastLines(n: number): string {
    const clean = this.clean();
    const lines = clean.split("\n");
    return lines.slice(-n).join("\n");
  }

  /** Total bytes currently stored */
  bytes(): number {
    return this.totalBytes;
  }

  /** Delta read — content since consumer's last read */
  delta(consumerId: string): string {
    const full = this.raw();
    const cursor = this.cursors.get(consumerId) ?? 0;
    const newContent = full.slice(cursor);
    this.cursors.set(consumerId, full.length);
    return newContent;
  }

  /** Reset a consumer's cursor (they'll get full content on next delta) */
  resetCursor(consumerId: string): void {
    this.cursors.delete(consumerId);
  }

  /** Clear the buffer entirely */
  clear(): void {
    this.buf = [];
    this.totalBytes = 0;
    this.cursors.clear();
  }
}
