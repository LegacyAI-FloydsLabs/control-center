import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildMarks, getMark, getMarksByType, formatMarks } from "./marks.js";

const CARGO_SESSION = [
  "user@host:~$ cargo build",
  "   Compiling mylib v0.1.0",
  "error[E0308]: mismatched types",
  "  --> src/lib.rs:42:5",
  "  expected `String`, found `&str`",
  "error: could not compile `mylib`",
  "user@host:~$ cargo test",
  "running 3 tests",
  "test test_one ... ok",
  "test test_two ... ok",
  "test test_three ... FAILED",
  "user@host:~$ ",
].join("\n");

describe("Output Marks", () => {
  it("creates marks from terminal output", () => {
    const marks = buildMarks(CARGO_SESSION);
    assert.ok(marks.length >= 3, `should have >=3 marks, got ${marks.length}`);
  });

  it("classifies command marks", () => {
    const marks = buildMarks(CARGO_SESSION);
    const cmds = getMarksByType(marks, "command");
    assert.ok(cmds.length >= 1, "should have at least 1 command mark");
    const first = cmds[0]!;
    assert.ok(first.text.includes("cargo build"), "first command should be cargo build");
  });

  it("classifies error marks", () => {
    const marks = buildMarks(CARGO_SESSION);
    const errors = getMarksByType(marks, "error");
    assert.ok(errors.length >= 1, "should have at least 1 error mark");
    assert.ok(errors[0]!.text.includes("mismatched types"), "error should contain the type error");
  });

  it("classifies prompt marks", () => {
    const marks = buildMarks(CARGO_SESSION);
    const prompts = getMarksByType(marks, "prompt");
    assert.ok(prompts.length >= 1, "should have at least 1 prompt mark");
  });

  it("assigns sequential IDs starting from 1", () => {
    const marks = buildMarks(CARGO_SESSION);
    assert.equal(marks[0]!.id, 1);
    for (let i = 1; i < marks.length; i++) {
      assert.equal(marks[i]!.id, marks[i - 1]!.id + 1, "IDs should be sequential");
    }
  });

  it("assigns unique stable refs", () => {
    const marks = buildMarks(CARGO_SESSION);
    const refs = marks.map((m) => m.ref);
    const unique = new Set(refs);
    assert.equal(unique.size, refs.length, "all refs should be unique");
  });

  it("getMark retrieves by ID", () => {
    const marks = buildMarks(CARGO_SESSION);
    const m1 = getMark(marks, 1);
    assert.ok(m1, "should find mark 1");
    assert.equal(m1.id, 1);
  });

  it("formatMarks produces numbered output", () => {
    const marks = buildMarks(CARGO_SESSION);
    const formatted = formatMarks(marks);
    assert.ok(formatted.includes("[1]"), "should have mark [1]");
    assert.ok(formatted.includes("[2]"), "should have mark [2]");
  });

  it("handles empty output", () => {
    const marks = buildMarks("");
    assert.equal(marks.length, 0);
  });

  it("handles single prompt line", () => {
    const marks = buildMarks("user@host:~$ ");
    assert.ok(marks.length >= 1);
  });
});
