import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { loadAtermConfig } from "./config.js";

const TEST_YAML = "/tmp/aterm-test-config.yml";

describe("aterm.yml config loader", () => {
  it("parses a standard two-session config", () => {
    fs.writeFileSync(TEST_YAML, `
sessions:
  - name: build
    command: npm run dev
    directory: /home/user/project
    tags: [dev, frontend]
    auto_start: true
    order: 1
  - name: tests
    command: npm test -- --watch
    directory: /home/user/project
    tags: [dev, test]
    order: 2
layout: 2x1
`);
    const config = loadAtermConfig(TEST_YAML);
    assert.equal(config.sessions.length, 2);
    assert.equal(config.sessions[0]!.name, "build");
    assert.equal(config.sessions[0]!.command, "npm run dev");
    assert.equal(config.sessions[0]!.directory, "/home/user/project");
    assert.deepEqual(config.sessions[0]!.tags, ["dev", "frontend"]);
    assert.equal(config.sessions[0]!.autoStart, true);
    assert.equal(config.sessions[0]!.order, 1);
    assert.equal(config.sessions[1]!.name, "tests");
    assert.equal(config.sessions[1]!.command, "npm test -- --watch");
    assert.equal(config.layout, "2x1");
  });

  it("handles commands with colons (URLs, ports)", () => {
    fs.writeFileSync(TEST_YAML, `
sessions:
  - name: proxy
    command: caddy reverse-proxy --to localhost:3000
    directory: /srv
`);
    const config = loadAtermConfig(TEST_YAML);
    assert.equal(config.sessions.length, 1);
    assert.equal(config.sessions[0]!.command, "caddy reverse-proxy --to localhost:3000");
  });

  it("returns empty sessions for empty file", () => {
    fs.writeFileSync(TEST_YAML, "");
    const config = loadAtermConfig(TEST_YAML);
    assert.equal(config.sessions.length, 0);
  });

  it("skips sessions without command field", () => {
    fs.writeFileSync(TEST_YAML, `
sessions:
  - name: orphan
    directory: /tmp
  - name: valid
    command: bash
`);
    const config = loadAtermConfig(TEST_YAML);
    // orphan has no command → skipped
    assert.equal(config.sessions.length, 1);
    assert.equal(config.sessions[0]!.name, "valid");
  });

  it("substitutes environment variables", () => {
    process.env.ATERM_TEST_DIR = "/custom/path";
    fs.writeFileSync(TEST_YAML, `
sessions:
  - name: dev
    command: bash
    directory: \${ATERM_TEST_DIR}/project
`);
    const config = loadAtermConfig(TEST_YAML);
    assert.equal(config.sessions[0]!.directory, "/custom/path/project");
    delete process.env.ATERM_TEST_DIR;
  });

  it("substitutes env vars with defaults", () => {
    delete process.env.ATERM_MISSING_VAR;
    fs.writeFileSync(TEST_YAML, `
sessions:
  - name: dev
    command: bash
    directory: \${ATERM_MISSING_VAR:-/fallback/path}
`);
    const config = loadAtermConfig(TEST_YAML);
    assert.equal(config.sessions[0]!.directory, "/fallback/path");
  });

  it("ignores comments", () => {
    fs.writeFileSync(TEST_YAML, `
# This is a comment
sessions:
  # Another comment
  - name: shell
    command: bash
    # inline comment (after a key-value line this should be a separate line)
`);
    const config = loadAtermConfig(TEST_YAML);
    assert.equal(config.sessions.length, 1);
    assert.equal(config.sessions[0]!.name, "shell");
  });
});
