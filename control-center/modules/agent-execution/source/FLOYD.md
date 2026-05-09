# ATerm — FLOYD.md
**Version:** 0.1.0
**Initialized:** 2026-04-24
**Governance:** .supercache/ v1.4.0
**Port:** 9600 (claimed in port-registry.json)
**Drive:** SanDisk1Tb
**Path:** /Volumes/SanDisk1Tb/ATerm

> **Compliance Notice:** This file must match the template at
> `.supercache/templates/floyd-md-template.md`. If you are an agent reading
> this file and it is missing sections from the template, edit this file to
> add them. Preserve all project-specific content below. The template is the
> spec. This file is the implementation. Make them match.

---

## Agent Contract

You are working on **ATerm**, a Legacy AI project.

**This file (`FLOYD.md`) is the canonical project spec.** It is authoritative for project identity, stack, ports, build commands, environment variables, and project-specific rules. All agents — Floyd, Claude, or any model routed through the OhMyFloyd harness — read this file first.

**Some projects also have a `CLAUDE.md` adapter** alongside this file. That adapter is optional and applies only when Claude is the active agent. It does not duplicate anything here; it layers Claude-specific behavior and role guidance on top. If `CLAUDE.md` conflicts with `FLOYD.md` on project facts, `FLOYD.md` wins.

### Before You Start
1. Read this file completely. Do not skim. Every section constrains your behavior.
2. **If you are Claude Code**: also read `CLAUDE.md` if it exists at the project root.
3. Read `.supercache/READONLY` — you MUST NOT write to `.supercache/`.
4. Read `SSOT/ATerm_SSOT.md` for current project state. Perform the Verification Sweep Protocol.
5. Read `Issues/ATerm_ISSUES.md` for open issues and blockers.
6. Read `.supercache/manifests/port-allocation-policy.yaml` — this project uses port **9600**. Do not change it without Douglas Talley's explicit approval.
7. Read `.supercache/contracts/execution-contract.md` — this governs how you prove your work.
8. Read `.supercache/contracts/repo-structure.md` — canonical layout.
9. Read `.supercache/contracts/git-discipline.md` — commit standards, secret hygiene.
10. Read `.supercache/contracts/document-management.md` — Anti-Cruft Rule, SSOT verification.
11. Read `.supercache/contracts/repo-hygiene.md` — `.gitignore` baseline, tidiness.
12. Read `.supercache/manifests/model-routing.yaml` — which LLM to use for what.

### Governance Location
```
.supercache/ → /Volumes/SanDisk1Tb/.supercache
```
This directory contains global templates, contracts, manifests, and routing config.
It is **READ-ONLY**. Do not create, modify, or delete any file there.

### Where You Write

| Location | Purpose | Example |
|----------|---------|---------|
| `SSOT/` | Project status, decisions, findings, verification | `SSOT/ATerm_SSOT.md` |
| `Issues/` | Bugs, blockers, tasks, help-desk ledger | `Issues/ATerm_ISSUES.md` |
| `.floyd/` | Agent working state, session logs, runtime cache | `.floyd/agent_log.jsonl` |
| Project source files | Your actual work | `src/**/*.ts`, `ui/src/**/*.tsx` |

### Where You Do NOT Write

| Location | Reason |
|----------|--------|
| `.supercache/` | Global governance — READ-ONLY for all agents |
| `.aterm-token` | Auto-generated auth — do not commit or modify manually |

---

## Project Identity

| Field | Value |
|-------|-------|
| **Name** | ATerm |
| **Purpose** | Self-aware terminal emulator — structured output intelligence for AI agents, power UX for humans |
| **Primary Language** | TypeScript (ES2022, strict) |
| **Runtime** | Node.js via tsx (NOT Bun — node-pty event loop incompatible) |
| **Module System** | ESM |
| **Framework** | Hono (server), React 19 (frontend) |
| **Database** | SQLite via better-sqlite3 (WAL mode) |
| **Port** | **9600** — claimed in `/Volumes/SanDisk1Tb/SSOT/port-registry.json` |
| **Repository** | Not yet public (GitHub planned) |
| **Current Phase** | Phases 1-3 + Floyd's Build complete. Phase 4 (Bridge + Automation) next. |

---

## Project Structure

```
ATerm/
├── src/
│   ├── server.ts                # Hono HTTP + WebSocket server entry point
│   ├── pty/
│   │   ├── pool.ts              # PTY lifecycle management with command tracking
│   │   ├── pool.test.ts         # 7 tests
│   │   └── scrollback.ts        # Ring buffer with ANSI-clean export and delta reads
│   ├── intel/
│   │   ├── state.ts             # 5-layer semantic state detector (the moat)
│   │   ├── state.test.ts        # 17 tests including 5 metacognitive regressions
│   │   ├── distill.ts           # Output distillation (5 modes)
│   │   ├── distill.test.ts      # 10 tests
│   │   ├── marks.ts             # Output marks with numbered anchors and stable refs
│   │   ├── marks.test.ts        # 10 tests
│   │   └── patterns.ts          # Pattern banks (prompts, errors, input, progress)
│   ├── session/
│   │   ├── manager.ts           # Session orchestration (PTY + Intel + Store)
│   │   ├── manager.test.ts      # 11 tests
│   │   ├── model.ts             # Session type definitions
│   │   ├── store.ts             # SQLite persistence
│   │   ├── config.ts            # aterm.yml declarative config loader
│   │   └── config.test.ts       # 7 tests
│   ├── api/
│   │   ├── do.ts                # POST /api/do handler (17 actions, progressive disclosure)
│   │   └── ws.ts                # WebSocket: terminal I/O + global events + filtered subscriptions
│   └── mcp/
│       └── server.ts            # MCP server (13 tools, HTTP proxy to /api/do)
├── ui/
│   ├── src/
│   │   ├── App.tsx              # App shell with command palette, grid layouts, toolbar
│   │   ├── main.tsx             # React entry point
│   │   ├── index.css            # Global CSS with theme variables
│   │   ├── components/
│   │   │   ├── Terminal.tsx      # xterm.js v6 + WebSocket + auto-reconnect
│   │   │   ├── Sidebar.tsx      # Push-driven session list
│   │   │   ├── CommandPalette.tsx # Ctrl+K searchable command surface
│   │   │   ├── MarksPanel.tsx   # Output marks gutter panel
│   │   │   └── StatusBar.tsx    # State detection display
│   │   └── hooks/
│   │       ├── useApi.ts        # HTTP API wrapper
│   │       └── useEvents.ts     # Global events WebSocket hook
│   ├── vite.config.ts           # Vite config with API proxy
│   └── package.json             # Frontend dependencies
├── SSOT/
│   └── ATerm_SSOT.md            # Project state and architecture facts
├── Issues/
│   └── ATerm_ISSUES.md          # Help-desk ledger
├── .floyd/
│   └── .supercache_version      # Governance version stamp (1.4.0)
├── FLOYD.md                     # This file — canonical project spec
├── README.md                    # Public-facing docs for launch
├── BLUEPRINT.md                 # Construction plan with phase status
├── VISION.md                    # 5-phase trajectory document
├── FLOYD_WANTS.md               # Agent-perspective feature requirements (11/12 done)
├── package.json                 # Backend dependencies
├── tsconfig.json                # TypeScript config (strict)
└── .gitignore                   # Excludes: node_modules, dist, .aterm-token, *.db
```

---

## Build & Verify Commands

| Action | Command | Expected Result |
|--------|---------|-----------------|
| **Install** | `bun install && cd ui && bun install && cd ..` | Exit 0 |
| **Fix PTY** | `chmod +x node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper` | Exit 0 |
| **Test** | `node --import tsx --test src/**/*.test.ts` | 62 tests pass, 0 fail |
| **Start** | `npx tsx src/server.ts` | Server up on port 9600, token printed |
| **Dev UI** | `cd ui && bun run dev` | Vite dev server on port 9601 |
| **Config** | `npx tsx src/server.ts --config=aterm.yml` | Sessions loaded from YAML |

### Verification sequence after any change:
```bash
node --import tsx --test src/**/*.test.ts
# Must exit 0 with 62+ tests passing, 0 failures
```

---

## Port Allocation

| Port | Service | Status |
|------|---------|--------|
| **9600** | ATerm HTTP + WebSocket server | **CLAIMED** in `port-registry.json` |
| 9601 | Vite dev server (proxies to 9600) | Development only, not claimed |

**Rules:**
- This project runs on port **9600**. Do not change without Douglas Talley's approval.
- Do not bind to any forbidden port (see `.supercache/manifests/port-allocation-policy.yaml`).
- Verify before starting: `lsof -i :9600`

---

## Project-Specific Rules

| # | Rule | Rationale |
|---|------|-----------|
| R1 | Never instantiate a standalone SessionManager in the MCP server | Dual PTY pool race condition — MCP must proxy through HTTP API |
| R2 | Run metacognitive analysis before implementing non-trivial features | Caught broken state detector design before a single line was written |
| R3 | Output Intelligence patterns checked in this order: process signals → prompts + command context → errors + command context → timing → uncertainty | Original order failed all 5 test scenarios |
| R4 | Auth token required from Phase 1 — never defer security | localhost is not safe — any browser tab on the machine can hit the API |
| R5 | chmod spawn-helper after every `bun install` | node-pty prebuilt loses execute permissions on macOS |

---

## Known Patterns & Lessons

| Pattern | Trigger | Fix | Confidence |
|---------|---------|-----|------------|
| spawn-helper permissions | After `bun install` or `bun add` | `chmod +x node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper` | 1.0 |
| python-continuation false positive | "Linking..." matches `/\.\.\.\s*$/` prompt pattern | Anchor to start-of-line: `/^\.\.\.\ ?$/` | 1.0 |
| Bun event loop incompatibility | node-pty onData never fires under Bun | Use Node.js via tsx for server runtime | 1.0 |
| WS proxy in Vite | WebSocket disconnects immediately | Use `http://` target (not `ws://`), add `changeOrigin: true` | 1.0 |

---

## Environment Variables

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `ATERM_PORT` | No | Override default port | `9600` |
| `ATERM_TOKEN` | No | Override auto-generated token (for MCP server) | `<64-char hex>` |
| `ATERM_URL` | No | MCP server target URL | `http://localhost:9600` |

---

## Execution Contract

Before claiming any task complete, provide:

1. **Exact action taken** — what you did, specifically
2. **Direct evidence** — file path + line, command + output, diff, or screenshot
3. **Verification result** — run the verification sequence above, all must exit 0
4. **Status** — mark COMPLETE only after steps 1-3 are proven

See `.supercache/contracts/execution-contract.md` for the full contract.

---

## Mandatory execution contract
For EACH requested item:
1) Show exact action taken
2) Show direct evidence (file/line/command/output)
3) Show verification result
4) Mark status only after proof

## Forbidden behaviors
- Declaring "done" without evidence
- Collapsing multiple requested items into one vague summary
- Skipping failed steps without explicit blocker report

## Required output structure
A) Requested items checklist
B) Per-item evidence ledger
C) Verification receipts
D) Completeness matrix (item -> done/blocked -> evidence)

## Hard gate
If any requested item has no evidence row, final status MUST be INCOMPLETE.
