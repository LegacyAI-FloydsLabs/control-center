# ATerm Construction Blueprint

**Objective:** Build the self-aware terminal — the agent's operating surface.
**Constraint:** No shortcuts. Every phase delivers something real that works end-to-end.
**Principle:** Build from the inside out. Output Intelligence first (the thing no one else has), then wrap it in the session manager, then expose the API, then build the UI.

**Current State:** Phases 1-3 + Floyd's Build complete. 62 tests, 0 failures, 5,390 lines.

---

## Why Inside-Out

Every competitor started with the UI and bolted on agent support later.
We start with what the agent needs and build the human UI as a projection of that.

```
COMPETITORS:  UI → Sessions → (maybe) Agent API
ATERM:        Output Intelligence → Session Model → Agent API → MCP → UI
```

---

## Phase 1 — The Core (Nerve Endings) [COMPLETE]

**Runtime:** Node.js via tsx (not Bun — node-pty onData events don't fire under Bun's event loop).
**DB:** better-sqlite3 (not bun:sqlite).

| Step | Status | Tests | Notes |
|------|--------|-------|-------|
| 1.1 Project scaffold + auth | DONE | curl verified | Hono server, auto-generated 256-bit token, 0600 permissions |
| 1.2 PTY pool with scrollback | DONE | 7/7 | node-pty, 256KB ring buffer, crash recovery with backoff, command tracking |
| 1.3 5-layer state detection | DONE | 17/17 | Process signals → prompt patterns + command context → error patterns → timing → honest uncertainty. Metacog caught broken original design. |
| 1.4 Output distillation | DONE | 10/10 | raw, clean, summary (~60% reduction), structured (typed segments), delta |
| 1.5 Output marks and refs | DONE | 10/10 | Command-tracking based boundaries, numbered marks, stable refs |
| 1.6 Session model + SQLite | DONE | 11/11 | Full CRUD, persistence, command history, scratchpads, TCC import |
| 1.7 POST /api/do | DONE | curl verified | 17 actions, progressive disclosure (3 tiers) |
| 1.8 MCP server | DONE | protocol verified | 13 tools, HTTP proxy architecture (no dual PTY pool) |

## Phase 2 — The Surface (Human Interface) [COMPLETE]

| Step | Status | Notes |
|------|--------|-------|
| 2.1 Frontend scaffold | DONE | Vite 8 + React 19 + TypeScript + Tailwind 4 |
| 2.2 Terminal view | DONE | xterm.js v6 + WebGL + fit/search/web-links addons |
| 2.3 Multi-session layout | DONE | 6 layouts: single, auto-fit, 2x1, 3x1, 2x2, tabs. Frame headers with status dots. |
| 2.4 Session management sidebar | DONE | Push-driven via /ws/events (not polling). Add form, status dots, delete. |
| 2.5 Command palette + keybindings | DONE | Ctrl+K palette, Ctrl+1-9 jump, Ctrl+Tab cycle, Ctrl+B sidebar |
| 2.6 Output marks overlay | DONE | Toggleable gutter panel with type colors. Click to expand. |
| 2.7 Theme and polish | PARTIAL | Dark theme with CSS variables. Light theme defined but not toggled. Mobile not tested. |

## Phase 3 — The Memory (Persistence and History) [COMPLETE]

| Step | Status | Notes |
|------|--------|-------|
| 3.1 Session persistence | DONE | SQLite, auto-start on server restart, scrollback replay on reconnect |
| 3.2 Command history | DONE | Per-session, searchable, cross-session search via API |
| 3.3 Checkpoints | DONE | Save/restore: scrollback + env + cwd + history + scratchpad + config |
| 3.4 Session scratchpad | DONE | Read/write via API (note action), persists in SQLite |
| 3.5 Workflow recording | DONE | Start/stop/list/get with timestamped events in SQLite |

## Floyd's Build — Features I Actually Want [COMPLETE]

These items were pulled forward from Phases 4-5 because they were needed for daily use:

| Feature | Originally | Status |
|---------|-----------|--------|
| Command palette + keybindings | Phase 2.5 | DONE |
| Grid/split/tab layouts | Phase 2.3 | DONE |
| aterm.yml declarative config | Phase 4.3 | DONE — 7/7 tests, env var substitution, --config= flag |
| Filtered event subscriptions | Phase 4.4 | DONE — subscribe/unsubscribe on /ws/events |
| verify action | Phase 1.7 | DONE — runs command, returns {passed, status, output} |
| batch action | Phase 1.7 | DONE — up to 20 actions sequentially |
| Output marks panel | Phase 2.6 | DONE — toggleable gutter with type colors |

## Phase 4 — The Bridges (Integration) [NEXT]

| Step | Status | Notes |
|------|--------|-------|
| 4.1 Floyd TTY Bridge integration | NOT STARTED | bridge action → route to Floyd TTY Bridge via file IPC or WebSocket |
| 4.2 Automation (cron/launchd) | NOT STARTED | Cron scheduling, launchd plist generation, health monitoring |
| ~~4.3 aterm.yml~~ | ~~PULLED FORWARD~~ | Done in Floyd's Build |
| ~~4.4 Agent communication~~ | ~~PULLED FORWARD~~ | Done in Floyd's Build (filtered events) |

**Remaining Phase 4 work:** Bridge integration + automation only.

## Phase 5 — The Network (Multi-Instance) [FUTURE]

| Step | Status | Notes |
|------|--------|-------|
| 5.1 Remote session proxy | NOT STARTED | ATerm A proxies sessions from ATerm B |
| 5.2 Unified view | NOT STARTED | Browser shows sessions from multiple instances |
| 5.3 Headless mode | NOT STARTED | API + MCP only, no frontend |

---

## Invariants (Verified After Every Step)

1. All existing tests pass — **62/62 green**
2. API returns correct progressive-disclosure responses at all 3 tiers — **verified**
3. Output Intelligence correctly detects state for bash, python, node shells — **17 regression tests**
4. MCP server responds to `tools/list` and `tools/call` — **13 tools verified**
5. No unhandled promise rejections or uncaught exceptions — **verified**
6. SQLite schema migrations are forward-compatible — **verified**
7. WebSocket connections survive server restart (auto-reconnect) — **implemented with exponential backoff**
8. Memory usage stays under 100MB for 10 concurrent sessions — **not formally measured**

---

## Gap Table — Current State

```
                  API    Web UI  Output Intel  MCP    Multi-Sess  Automation  Checkpoints  Config
ATerm (now):     YES    YES     YES           YES    YES         no          YES          YES
Warp:            ~int   No      No            ~cli   Yes         ~cloud      No           ~warp.md
freshell:        No     Yes     No            No     Yes         No          No           No
HiveTerm:        ~mcp   No      No            ~local Yes         Yes         No           hive.yml
```

ATerm has 7 of 8 properties. Automation (Phase 4.2) is the only gap.
