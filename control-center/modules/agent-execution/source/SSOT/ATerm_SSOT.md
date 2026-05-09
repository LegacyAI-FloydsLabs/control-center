# ATerm — Single Source of Truth

**Project:** ATerm
**Last Updated:** 2026-04-26 13:19 EDT
**Governance:** .supercache/ v1.4.1
**Authority:** This document is the authoritative source for ATerm architecture and state facts.

---

## Architecture Facts

| Fact | Value | Verified |
|------|-------|----------|
| Runtime | Node.js via tsx (not Bun — node-pty event loop incompatible) | 2026-04-24 100% — spike confirmed |
| Server framework | Hono | 2026-04-24 100% |
| PTY library | node-pty (prebuilt darwin-arm64) | 2026-04-24 100% |
| Database | better-sqlite3 (WAL mode) | 2026-04-24 100% |
| Frontend | React 19 + Vite 8 + Tailwind 4 + xterm.js v6 | 2026-04-24 100% |
| MCP SDK | @modelcontextprotocol/sdk | 2026-04-24 100% |
| Port | 9600 (claimed in port-registry.json) | 2026-04-24 100% |
| Auth | Auto-generated 256-bit token, .aterm-token, 0600 permissions | 2026-04-24 100% |
| Tests | 110 invocations across 18 test files (unit + functional) | 2026-04-26 100% |
| Lines | ~8,130 (server src 7,030 + ui src 1,100) | 2026-04-26 100% |
| Files | 36 source files (.ts/.tsx) under src/ + ui/src/ | 2026-04-26 100% |
| CI | GitHub Actions: tests + tsc, on push (.github/workflows/test.yml) | 2026-04-26 100% |
| License | MIT (LICENSE file, copyright Floyd's Labs / Legacy AI) | 2026-04-26 100% |
| Repo | github.com/LegacyAI-FloydsLabs/aterm.git (origin/main) | 2026-04-26 100% |

## State Detection Architecture

| Fact | Value | Verified |
|------|-------|----------|
| Detection layers | 5: process signals → prompt patterns + command tracking → error patterns + command context → timing heuristics → honest uncertainty | 2026-04-24 100% — 17 regression tests |
| Original design | Failed all 5 scenarios (metacognitive analysis ep_1777056625987_f4nzipfq7) | 2026-04-24 100% |
| Confidence scores | Every response includes {state, confidence: 0-1, method, detail} | 2026-04-24 100% |
| Pattern banks | 20+ prompt, 15+ input, 25+ error, 10+ progress patterns | 2026-04-24 100% |

## API State

| Fact | Value | Verified |
|------|-------|----------|
| Endpoint | POST /api/do | 2026-04-26 100% |
| Actions | 18: list, read, run, stop, start, cancel, answer, create, delete, note, search, broadcast, history, checkpoint, record, verify, batch, **bridge** | 2026-04-26 100% |
| Progressive disclosure | 3 tiers (small/average/frontier models) | 2026-04-26 100% |
| MCP tools | 13 forwarders to POST /api/do | 2026-04-26 100% |
| MCP transport | stdio + Streamable HTTP (added in fe5cee7) | 2026-04-26 100% |
| MCP architecture | HTTP proxy to POST /api/do (no standalone SessionManager) | 2026-04-26 100% |
| CORS | Hardened — localhost-only in production, permissive in dev (server.ts:66-77) | 2026-04-26 100% |
| Rate limit | 60 requests / 60s window per token (server.ts:80-99) | 2026-04-26 100% |
| WS state event throttle | Max 10/sec per session, last event always delivers (ws.ts:56-64) | 2026-04-26 100% |

## Phase Completion

| Phase | Status | Commit |
|-------|--------|--------|
| Phase 1: Core | COMPLETE | c5fd130 |
| Phase 2: UI scaffold + MCP HTTP-proxy fix | COMPLETE | fcdb5f4 |
| Phase 3: Memory, push events, auto-reconnect | COMPLETE | fedeed6 |
| Floyd's Build (Ctrl+K, layouts, aterm.yml, verify, batch) | COMPLETE | 4892441 |
| Documentation v1 | COMPLETE | 08e3550 |
| Governance v1.4.0 compliance | COMPLETE | 1c6e714 |
| Phase 4: Anvil bridge + cron automation | COMPLETE | f8765c3 |
| Vite WS proxy fix (events + sessions) | COMPLETE | 19214bd |
| React StrictMode removal (WS lifecycle compatibility) | COMPLETE | 8f8ef8b |
| Accessibility (WCAG AA contrast, landmarks, labels) | COMPLETE | da20127 |
| GitHub Actions CI workflow | COMPLETE | b5448ea |
| All-tsc-errors-resolved for CI | COMPLETE | bbe7915 |
| MIT LICENSE file | COMPLETE | e1b8b5e |
| Production defects fix (7 bugs caught by functional tests) | COMPLETE | c8b218b |
| Claim-grounded functional test suite (claims 1-12) | COMPLETE | ad2f01d |
| 16 ATerm weakness fixes (CORS, rate limit, WS throttle, MCP HTTP, theme, etc.) | COMPLETE | fe5cee7 |
| Phase 5: Multi-instance mesh | NOT STARTED | — |

## Key Design Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Node.js over Bun | node-pty onData events don't fire under Bun's event loop | 2026-04-24 |
| MCP as HTTP proxy | Prevents dual PTY pool race condition when MCP and HTTP server run simultaneously | 2026-04-24 |
| 5-layer state detection | Original regex-only approach failed metacognitive validation | 2026-04-24 |
| Push over poll | Project thesis: "terminal notifies agent, not agent polls terminal" | 2026-04-24 |
| Inside-out build order | Output Intelligence (moat) before UI (commodity) | 2026-04-24 |
| xterm.js v6 over wterm | Mature ecosystem, WebGL renderer, proven addon library. wterm monitored for future. | 2026-04-24 |
| AutomationRunner wired into SessionManager constructor | Library-only Phase 4 module promoted to runtime; `_onCronFire` callback fires registered cron jobs. | 2026-04-25 |
| MCP Streamable HTTP transport alongside stdio | Enables remote MCP clients without losing local stdio compatibility. Closes ISSUE-0003. | 2026-04-25 |
| FNV-1a hash for stable mark refs | Replaces global counter; refs survive scrollback eviction and rebuilds. Discovered via functional test claim 7. | 2026-04-25 |
| `commandActive` boolean replaces time-based `commandPending` | Time heuristics produced false positives for slow commands; explicit boolean set on write, cleared on terminal state. | 2026-04-25 |
| Live cwd/env tracking for checkpoint | Without this, restore put you back at session-config cwd, not where you were when you checkpointed. Tracks `cd` and `export` on PtyInstance. | 2026-04-25 |
| Anvil WS port aligned to 7777 | Was 7778 in ATerm; Chrome extension hardcodes 7777. Bridge silently failed before fix. | 2026-04-25 |
| `pool.remove()` instead of `pool.kill()` on stop | `kill()` left orphan instance, double-spawn on next `start()`. Surfaced by functional test stop/start lifecycle. | 2026-04-25 |
| Permissive license (MIT) | README declared MIT pre-launch; Vercel/Next.js model; matches MCP-ecosystem convention. Risk table §5 in product analysis aligned with permissive. Ratified 2026-04-25 via commit e1b8b5e. | 2026-04-25 |

---

## Test Infrastructure

| Layer | File(s) | Purpose | Verified |
|-------|---------|---------|----------|
| Unit — state detection | src/intel/state.test.ts (17 tests) | 5-layer detector + metacog regression scenarios | 2026-04-26 100% |
| Unit — distillation | src/intel/distill.test.ts (10 tests) | 5 modes, reduction percentages | 2026-04-26 100% |
| Unit — marks | src/intel/marks.test.ts (10 tests) | mark building, type classification | 2026-04-26 100% |
| Unit — PTY pool | src/pty/pool.test.ts (7 tests) | spawn, restart, command tracking | 2026-04-26 100% |
| Unit — session manager | src/session/manager.test.ts (11 tests) | CRUD, enrichment, events | 2026-04-26 100% |
| Unit — automation cron primitives | src/session/automation.test.ts (9 tests) | cron parser, validation, next-fire | 2026-04-26 100% |
| Unit — config loader | src/session/config.test.ts (7 tests) | aterm.yml parsing, env substitution | 2026-04-26 100% |
| Unit — API contract | src/api/do.test.ts (20 tests) | tier shapes, action validation | 2026-04-26 100% |
| Functional — API actions | src/api/do.functional.test.ts (2 tests) | claim 2: real /api/do over real server | 2026-04-26 100% |
| Functional — WebSocket | src/api/ws.functional.test.ts (3 tests) | claims 9-10: streaming + event channel | 2026-04-26 100% |
| Functional — state | src/intel/state.functional.test.ts (3 tests) | claims 3-5: real shells, real prompts | 2026-04-26 100% |
| Functional — distillation | src/intel/distill.functional.test.ts (1 test) | claim 6: real npm install reduction | 2026-04-26 100% |
| Functional — marks | src/intel/marks.functional.test.ts (1 test) | claim 7: marks survive eviction | 2026-04-26 100% |
| Functional — checkpoint | src/session/checkpoint.functional.test.ts (1 test) | claim 8: save/mutate/restore round-trip | 2026-04-26 100% |
| Functional — MCP | src/mcp/server.functional.test.ts (1 test) | claim 11: stdio proxy reaches HTTP API | 2026-04-26 100% |
| Functional — bridge | src/bridge/anvil.functional.test.ts (1 test) | claim 12: requires Chrome extension; expected fail in CI | 2026-04-26 100% (expected-fail by design) |
| Functional — automation | src/session/automation.functional.test.ts (5 tests) | cron firing end-to-end after AutomationRunner wiring | 2026-04-26 100% |
| Resource — memory | src/test/memory.test.ts (1 test) | RSS delta < 100MB for 5 sessions; observed 1.4MB delta | 2026-04-26 100% |

**Shared functional harness:** `src/test/functional-harness.ts` (305 LOC) — `startAtermServer`, `reservePort`, `createShellSession`, `waitForSessionState`, `waitForOutput`, `openJsonWebSocket`.

**Defects discovered by functional tests and fixed in c8b218b:** PTY stop/start lifecycle, command-active tracking, completed-error detection, command-scoped recent output, stable mark refs (FNV-1a), live cwd/env tracking for checkpoint, Anvil WS port alignment.

---

## Verification Log

Append-only record of fact verification per Verification Sweep Protocol (`.supercache/contracts/document-management.md` § "Verification Sweep Protocol").

| Timestamp | Section | Evidence | Confidence |
|---|---|---|---|
| 2026-04-26 13:19 EDT | Architecture Facts → Tests | `find src -name "*.test.ts" -exec grep -cE "^[[:space:]]+(it\|test)\(" {} +` → 110 | 100% |
| 2026-04-26 13:19 EDT | Architecture Facts → Lines | `find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} +` → 7,030 server + 1,100 ui = 8,130 | 100% |
| 2026-04-26 13:19 EDT | Architecture Facts → CI | File `.github/workflows/test.yml` exists; commit `b5448ea` added it | 100% |
| 2026-04-26 13:19 EDT | Architecture Facts → License | `cat LICENSE` shows MIT with `Copyright (c) 2026 Floyd's Labs / Legacy AI`; commit `e1b8b5e` | 100% |
| 2026-04-26 13:19 EDT | Architecture Facts → Repo | `git remote -v` shows `origin https://github.com/LegacyAI-FloydsLabs/aterm.git` | 100% |
| 2026-04-26 13:19 EDT | API State → Actions | `src/api/do.ts:14-17` declares 18 actions in `Action` union; `:44-48` validates the same 18 in `VALID_ACTIONS` | 100% |
| 2026-04-26 13:19 EDT | API State → MCP transport | `src/mcp/server.ts` includes Streamable HTTP transport (added in fe5cee7); previous version had stdio only | 100% |
| 2026-04-26 13:19 EDT | API State → CORS | `src/server.ts:66-77` configures `cors()` with allowlist | 100% |
| 2026-04-26 13:19 EDT | API State → Rate limit | `src/server.ts:80-99` implements 60req/60s bucket | 100% |
| 2026-04-26 13:19 EDT | API State → WS throttle | `src/api/ws.ts:56-64` `throttledStateBroadcast` enforces 10/s per session | 100% |
| 2026-04-26 13:19 EDT | Phase Completion → Phase 4 | Commit `f8765c3 feat: Phase 4 complete — Anvil bridge + cron automation` exists in `git log` | 100% |
| 2026-04-26 13:19 EDT | Phase Completion → Test suite | Commit `ad2f01d test: add claim-grounded functional test suite (claims 1-12)` exists | 100% |
| 2026-04-26 13:19 EDT | Key Design Decisions → AutomationRunner wiring | `src/session/manager.ts:14,27,33` import + private field + constructor instantiation | 100% |
| 2026-04-26 13:19 EDT | Key Design Decisions → FNV-1a marks | `src/intel/marks.ts` updated in c8b218b to use FNV-1a hash for `ref` | 100% |
| 2026-04-26 13:19 EDT | Test Infrastructure → memory test | Live run: baseline 81.1MB → 82.5MB after 5 sessions, delta 1.4MB. Result: PASS, well under 100MB budget | 100% |
| 2026-04-26 13:19 EDT | Test Infrastructure → state tests | Live run: 17/17 pass in 371ms via `node --import tsx --test src/intel/state.test.ts` | 100% |

---

## Change Log

- 2026-04-26 13:19 EDT — Verification sweep performed to close governance gap (SSOT had been stale since 2026-04-24 across 12 facts). Updated Architecture Facts (test count 62→110, lines 5,390→8,130, added CI/License/Repo rows), API State (17→18 actions, MCP stdio→stdio+HTTP, added CORS/rate-limit/WS-throttle rows), Phase Completion (Phase 4 NOT STARTED→COMPLETE plus 11 new completion rows for v0.1.0 prep work), Key Design Decisions (added 8 new decisions covering AutomationRunner wiring, MCP HTTP, FNV-1a marks, commandActive boolean, cwd/env tracking, Anvil port fix, pool.remove on stop, MIT license ratification). Added new Test Infrastructure section (18 test files, 110 invocations, shared harness). Added Verification Log section (16 fact verifications at 100%). Issues ledger separately updated to reflect 5 issues resolved by recent commits.
- 2026-04-24 17:30 EDT — Initial SSOT created. All facts verified against codebase at commit 08e3550.
