/**
 * Memory usage test — verifies RSS stays under 100MB with multiple PTY sessions.
 *
 * Measures delta RSS from baseline after spawning 5 bash sessions.
 * This test is meaningful on macOS/Linux where process.memoryUsage.rss()
 * reflects actual resident set size.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { SessionStore } from "../session/store.js";
import { SessionManager } from "../session/manager.js";

const MEMORY_LIMIT_MB = 100;
const SESSION_COUNT = 5;
const TEST_DB = "/tmp/aterm-memtest-" + Date.now() + ".db";

describe("Memory usage", () => {
  test(`stays under ${MEMORY_LIMIT_MB}MB with ${SESSION_COUNT} sessions`, async () => {
    // Force GC before baseline if available
    if (global.gc) global.gc();

    const store = new SessionStore(TEST_DB);
    const mgr = new SessionManager(store);

    const baseline = process.memoryUsage.rss();

    // Create and start sessions
    for (let i = 0; i < SESSION_COUNT; i++) {
      mgr.create({
        name: `mem-test-${i}`,
        command: "bash",
        directory: process.cwd(),
      }, true);
    }

    // Wait for shells to initialize
    await new Promise((r) => setTimeout(r, 2000));

    const afterRss = process.memoryUsage.rss();
    const delta = afterRss - baseline;
    const deltaMB = delta / (1024 * 1024);
    const baselineMB = baseline / (1024 * 1024);
    const afterMB = afterRss / (1024 * 1024);

    console.log(`Memory: baseline ${baselineMB.toFixed(1)}MB → after ${afterMB.toFixed(1)}MB (delta ${deltaMB.toFixed(1)}MB)`);

    // Cleanup
    mgr.destroy();
    try { fs.unlinkSync(TEST_DB); } catch {}

    assert.ok(
      deltaMB < MEMORY_LIMIT_MB,
      `RSS delta ${deltaMB.toFixed(1)}MB exceeds ${MEMORY_LIMIT_MB}MB threshold`,
    );
  });
});
