import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  createShellSession,
  doRequest,
  startAtermServer,
  uniqueName,
} from "../test/functional-harness.js";

function createNoisyNpmPackage(root: string): string {
  const packageDir = path.join(root, "noisy-package");
  mkdirSync(packageDir, { recursive: true });
  writeFileSync(path.join(packageDir, "package.json"), JSON.stringify({
    name: "aterm-noisy-install-fixture",
    version: "1.0.0",
    scripts: { postinstall: "node postinstall.js" },
  }, null, 2));
  writeFileSync(path.join(packageDir, "postinstall.js"), `
for (let i = 0; i < 120; i++) {
  console.log("⸩ ░░░░░░░░░░░░░░░░░░ idealTree:lib: sill idealTree buildDeps " + i);
}
console.log("\\x1b[32mNOISY_INSTALL_DONE\\x1b[0m");
`);
  writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "aterm-distill-functional-root",
    version: "1.0.0",
    private: true,
  }, null, 2));
  return packageDir;
}

describe("README/doc claim 6 — output distillation on real npm install", { timeout: 90_000 }, () => {
  it("returns distinct raw/clean/summary/structured/delta content, >=50% summary reduction, and delta-only new bytes", async () => {
    const server = await startAtermServer();
    try {
      const packageDir = createNoisyNpmPackage(server.cwd);
      const session = await createShellSession(server, uniqueName("distill"));

      const install = await doRequest(server, {
        action: "run",
        session: session.name,
        input: `npm install --foreground-scripts --no-audit --no-fund --package-lock=false ${packageDir}`,
        wait_until: "NOISY_INSTALL_DONE",
        timeout: 45,
        output_mode: "clean",
        include_advanced: true,
      });
      assert.equal(install.data.ok, true);
      assert.match(install.data.output, /NOISY_INSTALL_DONE/);

      const raw = await doRequest(server, { action: "read", session: session.name, output_mode: "raw", include_advanced: true, lines: 500 });
      const clean = await doRequest(server, { action: "read", session: session.name, output_mode: "clean", include_advanced: true, lines: 500 });
      const summary = await doRequest(server, { action: "read", session: session.name, output_mode: "summary", include_advanced: true, lines: 500 });
      const structured = await doRequest(server, { action: "read", session: session.name, output_mode: "structured", include_advanced: true, lines: 500 });

      assert.notEqual(raw.data.output, clean.data.output, "raw and clean must differ because raw preserves ANSI");
      assert.notEqual(clean.data.output, summary.data.output, "clean and summary must differ because summary removes npm progress noise");
      assert.notEqual(summary.data.output, structured.data.output, "summary and structured must differ because structured emits typed segments");
      assert.ok(summary.data.reduction_pct >= 50, `summary reduction must be >=50%, got ${summary.data.reduction_pct}%`);
      assert.match(summary.data.output, /NOISY_INSTALL_DONE/, "summary should keep signal line");
      assert.doesNotMatch(summary.data.output, /idealTree:lib: sill idealTree buildDeps 119/, "summary should remove noisy npm progress lines");

      const firstDelta = await doRequest(server, { action: "read", session: session.name, output_mode: "delta", include_advanced: true });
      assert.match(firstDelta.data.output, /NOISY_INSTALL_DONE/, "first API delta read primes the api consumer cursor with current output");

      await doRequest(server, {
        action: "run",
        session: session.name,
        input: "printf 'DISTILL_DELTA_ONLY\\n'",
        wait_until: "DISTILL_DELTA_ONLY",
        timeout: 5,
      });
      const secondDelta = await doRequest(server, { action: "read", session: session.name, output_mode: "delta", include_advanced: true });
      assert.match(secondDelta.data.output, /DISTILL_DELTA_ONLY/, "delta must include new bytes since the last api consumer read");
      assert.doesNotMatch(secondDelta.data.output, /NOISY_INSTALL_DONE/, "delta must not repeat bytes already consumed by that consumer");

      const distinctContents = new Set([
        raw.data.output,
        clean.data.output,
        summary.data.output,
        structured.data.output,
        secondDelta.data.output,
      ]);
      assert.equal(distinctContents.size, 5, "all five distillation modes must produce distinct content in this functional scenario");
    } finally {
      await server.dispose();
    }
  });
});
