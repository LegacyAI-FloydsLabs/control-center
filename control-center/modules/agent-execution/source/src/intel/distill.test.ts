import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Scrollback } from "../pty/scrollback.js";
import { distill } from "./distill.js";

// Simulate npm install output with ANSI codes, progress bars, and real content
const NPM_OUTPUT = [
  "\x1b[32mnpm\x1b[39m \x1b[32mwarn\x1b[39m deprecated inflight@1.0.6",
  "⸩ ░░░░░░░░░░░░░░░░░░ idealTree:lib: sill idealTree",
  "⸩ ░░░░░░░░░░░░░░░░░░ idealTree:lib: sill idealTree buildDeps",
  "⸩ ░░░░░░░░░░░░░░░░░░ idealTree:lib: sill idealTree",
  "",
  "added 137 packages, and audited 138 packages in 4s",
  "",
  "15 packages are looking for funding",
  "  run `npm fund` for details",
  "",
  "found 0 vulnerabilities",
].join("\n");

// Simulate cargo build with error
const CARGO_OUTPUT = [
  "user@host:~/project$ cargo build",
  "   Compiling mylib v0.1.0 (/home/user/project)",
  "   Compiling mylib v0.1.0 (/home/user/project)",
  "error[E0308]: mismatched types",
  "  --> src/lib.rs:42:5",
  "   |",
  "42 |     let x: String = get_name();",
  "   |                     ^^^^^^^^^^ expected `String`, found `&str`",
  "   |",
  "error: could not compile `mylib` (lib) due to 1 previous error",
  "user@host:~/project$ ",
].join("\n");

function makeScrollback(content: string): Scrollback {
  const sb = new Scrollback();
  sb.append(content);
  return sb;
}

describe("Output Distillation", () => {
  describe("mode: raw", () => {
    it("returns content unchanged", () => {
      const sb = makeScrollback(NPM_OUTPUT);
      const result = distill(sb, "raw");
      assert.equal(result.content, NPM_OUTPUT);
      assert.equal(result.reductionPct, 0);
    });
  });

  describe("mode: clean", () => {
    it("strips ANSI escape codes", () => {
      const sb = makeScrollback(NPM_OUTPUT);
      const result = distill(sb, "clean");
      assert.ok(!result.content.includes("\x1b["), "should not contain ANSI CSI");
      assert.ok(result.content.includes("npm warn deprecated"), "should preserve text content");
    });
  });

  describe("mode: summary", () => {
    it("removes progress bars and noise", () => {
      const sb = makeScrollback(NPM_OUTPUT);
      const result = distill(sb, "summary");
      assert.ok(!result.content.includes("idealTree"), "should remove progress noise");
      assert.ok(result.content.includes("added 137 packages"), "should keep result");
      assert.ok(result.content.includes("found 0 vulnerabilities"), "should keep final status");
    });

    it("keeps error lines", () => {
      const sb = makeScrollback(CARGO_OUTPUT);
      const result = distill(sb, "summary");
      assert.ok(result.content.includes("error[E0308]"), "should keep error");
      assert.ok(result.content.includes("mismatched types"), "should keep error detail");
    });

    it("achieves meaningful reduction on noisy output", () => {
      const sb = makeScrollback(NPM_OUTPUT);
      const result = distill(sb, "summary");
      assert.ok(result.reductionPct > 30, `reduction should be >30%, got ${result.reductionPct}%`);
    });

    it("respects maxLines", () => {
      const sb = makeScrollback(CARGO_OUTPUT);
      const result = distill(sb, "summary", { maxLines: 3 });
      const lines = result.content.split("\n").filter((l) => l.trim());
      assert.ok(lines.length <= 3, `should have <=3 non-empty lines, got ${lines.length}`);
    });
  });

  describe("mode: structured", () => {
    it("parses cargo output into typed segments", () => {
      const sb = makeScrollback(CARGO_OUTPUT);
      const result = distill(sb, "structured");
      assert.ok(result.segments, "should have segments");
      assert.ok(result.segments!.length >= 2, `should have >=2 segments, got ${result.segments!.length}`);

      const types = result.segments!.map((s) => s.type);
      assert.ok(types.includes("command"), "should have a command segment");
      assert.ok(types.includes("error"), "should have an error segment");
    });

    it("separates command from output", () => {
      const sb = makeScrollback(CARGO_OUTPUT);
      const result = distill(sb, "structured");
      const cmd = result.segments!.find((s) => s.type === "command");
      assert.ok(cmd, "should find command segment");
      assert.ok(cmd!.text.includes("cargo build"), "command should be cargo build");
    });
  });

  describe("mode: delta", () => {
    it("returns only new content since last read", () => {
      const sb = makeScrollback("first output\n");
      const d1 = distill(sb, "delta", { consumerId: "agent-1" });
      assert.ok(d1.content.includes("first output"));

      sb.append("second output\n");
      const d2 = distill(sb, "delta", { consumerId: "agent-1" });
      assert.ok(d2.content.includes("second output"), "should have new content");
      assert.ok(!d2.content.includes("first output"), "should NOT have old content");
    });

    it("strips ANSI from delta output", () => {
      const sb = makeScrollback("\x1b[31mred\x1b[0m\n");
      const d = distill(sb, "delta", { consumerId: "agent-2" });
      assert.ok(!d.content.includes("\x1b["), "delta should strip ANSI");
      assert.ok(d.content.includes("red"));
    });
  });
});
