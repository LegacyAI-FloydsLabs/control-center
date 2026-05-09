import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { StateDetector, type CommandContext } from "./state.js";

function ctx(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    commandPending: false,
    lastCommandText: null,
    lastCommandSentAt: null,
    lastOutputAt: null,
    processRunning: true,
    exitCode: null,
    ...overrides,
  };
}

describe("StateDetector — 5-Layer Architecture", () => {
  // -----------------------------------------------------------------------
  // Layer 1: Definitive process signals
  // -----------------------------------------------------------------------
  describe("Layer 1 — Process signals", () => {
    it("detects exited state from exit code", () => {
      const d = new StateDetector();
      const r = d.detect("", "", ctx({ processRunning: false, exitCode: 0 }));
      assert.equal(r.state, "exited");
      assert.equal(r.confidence, 1.0);
      assert.equal(r.method, "process_exit");
    });

    it("detects stopped when process not running and no exit code", () => {
      const d = new StateDetector();
      const r = d.detect("", "", ctx({ processRunning: false, exitCode: null }));
      assert.equal(r.state, "stopped");
      assert.equal(r.confidence, 1.0);
    });
  });

  // -----------------------------------------------------------------------
  // Layer 2: Prompt/Input patterns + command context
  // -----------------------------------------------------------------------
  describe("Layer 2 — Prompt and input patterns", () => {
    it("detects ready from bash prompt when no command pending", () => {
      const d = new StateDetector();
      const r = d.detect("user@host:~$ ", "", ctx());
      assert.equal(r.state, "ready");
      assert.ok(r.confidence >= 0.8);
      assert.equal(r.method, "prompt_pattern");
    });

    it("detects ready from Python REPL prompt", () => {
      const d = new StateDetector();
      const r = d.detect(">>> ", "", ctx());
      assert.equal(r.state, "ready");
    });

    it("detects waiting_for_input when command pending and input pattern matches", () => {
      const d = new StateDetector();
      const r = d.detect("Continue? [y/n] ", "", ctx({
        commandPending: true,
        lastCommandSentAt: Date.now() - 1000,
      }));
      assert.equal(r.state, "waiting_for_input");
      assert.ok(r.confidence >= 0.85);
      assert.equal(r.method, "input_pattern");
    });

    it("detects sudo password prompt as waiting_for_input", () => {
      const d = new StateDetector();
      const r = d.detect("[sudo] password for user: ", "", ctx({
        commandPending: true,
        lastCommandSentAt: Date.now() - 500,
      }));
      assert.equal(r.state, "waiting_for_input");
    });

    it("does NOT classify $ prompt as input-waiting (the original bug)", () => {
      // This was the critical bug found by metacognitive analysis:
      // $ prompt was being classified as waiting_for_input because
      // INPUT_PATTERNS were checked before PROMPT_PATTERNS
      const d = new StateDetector();
      const r = d.detect("bash-3.2$ ", "", ctx());
      assert.equal(r.state, "ready", "$ prompt should be ready, not waiting_for_input");
      assert.equal(r.method, "prompt_pattern");
    });
  });

  // -----------------------------------------------------------------------
  // Layer 3: Error/Progress patterns + command context
  // -----------------------------------------------------------------------
  describe("Layer 3 — Error and progress patterns", () => {
    it("detects error when command was sent and error in output + prompt visible", () => {
      const d = new StateDetector();
      const r = d.detect(
        "user@host:~$ ",
        "error[E0308]: mismatched types\n  --> src/lib.rs:42:5\n",
        ctx({ commandPending: true, lastCommandSentAt: Date.now() - 5000 })
      );
      assert.equal(r.state, "error");
      assert.ok(r.confidence >= 0.7);
    });

    it("does NOT flag error when cat-ing a log file (the false positive bug)", () => {
      // This was the second bug: a traceback in cat output shouldn't be an error
      // Because commandPending is false and command wasn't recent
      const d = new StateDetector();
      const r = d.detect(
        "user@host:~$ ",
        "Traceback (most recent call last):\n  File 'old.py', line 1\nValueError: bad\n",
        ctx({ commandPending: false, lastCommandSentAt: Date.now() - 120_000 })
      );
      // Should be ready (prompt visible, no recent command)
      assert.equal(r.state, "ready");
    });

    it("detects progress during active command", () => {
      const d = new StateDetector();
      const r = d.detect(
        "Compiling crate (45%)",
        "Compiling crate (45%)\n",
        ctx({
          commandPending: true,
          lastCommandSentAt: Date.now() - 3000,
          lastOutputAt: Date.now() - 100,
        })
      );
      assert.equal(r.state, "busy");
      assert.equal(r.method, "progress_pattern");
    });
  });

  // -----------------------------------------------------------------------
  // Layer 4: Timing heuristics
  // -----------------------------------------------------------------------
  describe("Layer 4 — Timing heuristics", () => {
    it("returns busy when output was very recent and command pending", () => {
      const d = new StateDetector();
      const r = d.detect("some output", "some output\n", ctx({
        commandPending: true,
        lastCommandSentAt: Date.now() - 5000,
        lastOutputAt: Date.now() - 500,
      }));
      assert.equal(r.state, "busy");
      assert.equal(r.method, "timing_heuristic");
      assert.ok(r.confidence <= 0.6, "timing should have low confidence");
    });
  });

  // -----------------------------------------------------------------------
  // Layer 5: Honest uncertainty
  // -----------------------------------------------------------------------
  describe("Layer 5 — Honest uncertainty", () => {
    it("returns previous state with low confidence when nothing matches", () => {
      const d = new StateDetector();
      // First, set a known state
      d.detect("user@host:~$ ", "", ctx());
      // Now give ambiguous input
      const r = d.detect("some random text", "", ctx());
      assert.equal(r.confidence, 0.3);
      assert.equal(r.method, "no_match");
    });
  });

  // -----------------------------------------------------------------------
  // Regression: The 5 scenarios from metacognitive analysis
  // -----------------------------------------------------------------------
  describe("Metacognitive regression scenarios", () => {
    it("npm install progress bar is busy, not waiting_for_input", () => {
      const d = new StateDetector();
      const r = d.detect(
        "⸩ ░░░░░░░░░░░░░░░░░░ idealTree:lib: sill idealTree buildDeps",
        "npm warn deprecated\n⸩ ░░░░░░░░░░░░░░░░░░ idealTree:lib: sill idealTree buildDeps",
        ctx({
          commandPending: true,
          lastCommandSentAt: Date.now() - 10000,
          lastOutputAt: Date.now() - 200,
        })
      );
      assert.notEqual(r.state, "waiting_for_input");
    });

    it("Python traceback in cat output is not an error", () => {
      const d = new StateDetector();
      const r = d.detect(
        "user@host:~$ ",
        "Traceback (most recent call last):\n  File 'old.py'\nValueError: bad\nuser@host:~$ ",
        ctx({ commandPending: false, lastCommandSentAt: Date.now() - 90_000 })
      );
      assert.equal(r.state, "ready");
    });

    it("sudo prompt detected as waiting_for_input", () => {
      const d = new StateDetector();
      const r = d.detect(
        "[sudo] password for douglas: ",
        "[sudo] password for douglas: ",
        ctx({ commandPending: true, lastCommandSentAt: Date.now() - 1000 })
      );
      assert.equal(r.state, "waiting_for_input");
    });

    it("custom PS1 with only > is detected as ready", () => {
      const d = new StateDetector();
      const r = d.detect(
        "myproject > ",
        "myproject > ",
        ctx()
      );
      assert.equal(r.state, "ready");
    });

    it("long silent build is not immediately ready", () => {
      const d = new StateDetector();
      // Linking phase — 8 seconds of silence but command was sent 20s ago
      const r = d.detect(
        "Linking...",
        "Compiling foo\nCompiling bar\nLinking...",
        ctx({
          commandPending: true,
          lastCommandSentAt: Date.now() - 20000,
          lastOutputAt: Date.now() - 8000,
        })
      );
      // Should be busy or uncertain, not ready
      assert.notEqual(r.state, "ready");
    });
  });
});
