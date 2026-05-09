# F.U.C.K. — Technical Feature Reference

## Or: Everything The Kernel Does (And What It's Saving For Later)

**DOCUMENT CLASSIFICATION:** Technical Reference / Factual
**DATE RECORDED:** 2026-05-09
**PRODUCT:** Floyd's Unified Command Kernel (F.U.C.K.)
**KERNEL PORT:** 10527

---

## Overview

F.U.C.K. is a single monoapplication. It consolidates seven Legacy AI capabilities into one FastAPI backend with a zero-build vanilla JavaScript frontend, served from port 10527. Every module lives inside the Kernel's `modules/` directory as copied-and-adapted source — not iframes, not adapters, not a launcher pretending to be integration.

This document covers every feature the Kernel ships: what's live, what's wired but stubbed, and what's latent infrastructure waiting for a consumer.

---

## Active Features

### Backend

| Feature | Detail |
|---|---|
| **Runtime** | Python 3.14, uvicorn, launchd-managed (`~/Library/LaunchAgents/com.legacyai.tcc.plist`) |
| **Framework** | FastAPI with async handlers |
| **Total Python lines** | 11,599 (core files, excluding `.venv`) |
| **Test suite** | 195 tests across 22 test files, `pytest` |
| **WebSocket endpoints** | 4 (PTY, collab, events, agent catch-all) |
| **REST API routes** | 30+ endpoints across 8 domain groups |

### REST API Surface

#### Governance (`/api/projects`)
- `GET /api/projects` — scan and list all registered projects
- `GET /api/quarantine-summary` — quarantined document report
- `GET /api/tags` — project tag index
- `POST /api/projects/{name}/bootstrap` — dispatch bootstrap make targets
- `POST /api/projects/{name}/finisher` — run completion verification

#### Filesystem (`/api/fs`)
- `GET /api/fs/home` — user home directory path
- `GET /api/fs/list` — directory listing
- `GET /api/fs/read` — file content reader
- `POST /api/fs/write` — file writer
- `POST /api/fs/mkdir` — directory creation
- `POST /api/fs/rename` — rename/move
- `POST /api/fs/remove` — delete
- `GET /api/fs/stat` — file metadata
- `GET /api/fs/serve` — static file serve (replaces `file://` links)
- `POST /api/fs/browse` — directory browser

#### Vault (`/api/vault`)
- `GET /api/vault/list` — list stored secrets
- `POST /api/vault/set` — store a secret
- `POST /api/vault/delete` — remove a secret

#### ATerm Agent Actions (`POST /api/do`)
19 actions accepted via single POST endpoint. See **ATerm Actions** section for active vs stub breakdown.

#### Health
- `GET /api/system-health` — current system health snapshot
- `GET /api/system-health/rescan` — trigger fresh scan

#### LLM Proxy
- `POST /api/llm/stream` — streaming LLM proxy (DeepSeek via vaulted key)
- `POST /api/llm/test` — connectivity test

#### Git Proxy
- `ANY /api/git-proxy/{path}` — forward git operations

#### Agents
- `GET /api/agents` — list registered agents with live status
- `GET /api/agents/{id}` — single agent detail
- `POST /api/agents/{id}/restart` — restart a running agent

### WebSocket Endpoints

| Endpoint | Protocol | Purpose | Status |
|---|---|---|---|
| `/ws/pty` | JSON-PTY (MWIDE TerminalPane) | Real PTY spawn/stream with session resume | **Live** |
| `/ws/collab` | Room-based fan-out (MWIDE collab.ts) | Real-time document sync | **Live** |
| `/ws/events` | Push events (ATerm useEvents.ts) | Session lifecycle broadcasting | **Live** |
| `/ws/{agent_id}` | Raw PTY bytes (catch-all) | Sidebar agent terminals + ATerm session terminals | **Live** |

### ATerm Actions (`POST /api/do`)

**Live (functional PTY-backed):**

| Action | Behavior |
|---|---|
| `list` | List all ATerm sessions |
| `create` | Create a new named session |
| `delete` | Destroy a session |
| `start` | Spawn a real PTY process in the session |
| `stop` | Kill the PTY process |
| `cancel` | Interrupt the running PTY |
| `run` | Send input to the PTY |
| `read` | Read PTY output buffer |
| `note` | Attach a note to a session |

**Stub (accepted, returns generic acknowledgment):**

| Action | Response |
|---|---|
| `search` | `{"ok": true, "results": [], "hint": "No matches found."}` |
| `history` | `{"ok": true, "history": [], "hint": "0 commands in history."}` |
| `broadcast` | `{"ok": true, "sent": 0, "total": 0, "hint": "No sessions to broadcast to."}` |
| `bridge` | Returns `{"ok": true}` with connection placeholder |
| All others | `{"ok": true, "hint": "Action '{action}' acknowledged (stub)."}` |

### Frontend — 11 Nav Tabs

| Tab | Module | Integration | Status |
|---|---|---|---|
| Project Control | Kernel-native | Direct DOM | **Live** |
| Terminal Console | Kernel-native | WebSocket PTY, xterm.js | **Live** |
| Dual Console | Kernel-native | Two-pane terminal | **Live** |
| Workspace | Kernel-native | File browser | **Live** |
| Workspace Editor | `modules/workspace-editor/` (MWIDE copy) | Dynamic `<script>` injection | **Live** |
| System Health | Kernel-native | Direct DOM | **Live** |
| System Map | `modules/system-map/` | Shadow DOM | **Live** |
| Agent Execution | `modules/agent-execution/` (ATerm copy) | Dynamic `<script>` injection | **Live** |
| Dev Launcher | `static/dev-launcher/` | Iframe (self-contained Vite SPA) | **Live** |
| Spend Watch | Self-contained | Iframe | **Live** |
| Mac Cleanup | Self-contained | Iframe | **Live** |

### Theme System

- Tokyo Night-inspired dark theme
- CSS custom properties with runtime switching
- `@keyframes fuck-color-sync` for branded title cycling
- WCAG AA contrast compliance on all themed surfaces

### Responsive Layout

- Three breakpoints: mobile, tablet, desktop
- Sidebar collapse on narrow viewports
- Full keyboard navigation support

### Test Coverage

- **195 tests** across 22 files
- WebSocket behavioral tests (PTY, collab, events)
- ATerm PTY integration lifecycle (create → start → run → read → stop → delete)
- MWIDE API tests (filesystem, vault, LLM proxy, git proxy)
- Governance tests (project scanning, quarantine, tags, links)
- Workflow UI tests via Playwright (requires `playwright install`)

---

## Dormant / Latent Features

These are capabilities where the infrastructure exists in the codebase but is either stubbed, unwired, or lacks a frontend consumer.

### 1. ATerm Broadcast Action
- **What:** The `broadcast` action on `POST /api/do` is accepted but returns `sent: 0, total: 0`.
- **Infrastructure:** Backend handler exists, WebSocket fan-out architecture is proven (see `/ws/collab`).
- **Blocker:** No broadcast routing logic. Needs session subscription model and message fan-out to connected agent terminals.

### 2. ATerm Search / History
- **What:** `search` returns empty results. `history` returns empty array.
- **Infrastructure:** Action handlers exist, session store exists.
- **Blocker:** No persistence layer for command history. No search index. Session data is in-memory only during beta.

### 3. ATerm Bridge (anvil-client)
- **What:** The `bridge` action returns a placeholder. The `anvil-client` bridge code exists in the ATerm source but is not wired into the Kernel's backend.
- **Infrastructure:** Original bridge code at `/Volumes/SanDisk1Tb/ATerm/` (untouched source).
- **Blocker:** Not copied into Kernel module. No MCP bridge endpoint. No tunnel configuration.

### 4. ATerm MCP Server
- **What:** ATerm source includes an MCP server definition. Not wired into the Kernel.
- **Infrastructure:** Exists in original ATerm source.
- **Blocker:** Not copied or adapted for Kernel architecture. Would need registration with the Kernel's MCP integration layer.

### 5. Collab WebSocket — No UI Consumer
- **What:** The `/ws/collab` endpoint is fully functional (room-based fan-out). The Workspace Editor frontend has collab infrastructure (`collab.ts`).
- **Infrastructure:** Backend is live. Frontend code exists.
- **Blocker:** No UI exposing multi-user collaboration. No session sharing flow. The pipe is built; nobody's turned on the faucet.

### 6. Workspace Editor Backend (PTY Hub)
- **What:** MWIDE's frontend is fully copied into the Kernel and renders. The backend has `/ws/pty` for terminal access.
- **Infrastructure:** MWIDE source includes a `pty-hub` service for persistent workspace terminals.
- **Blocker:** The pty-hub was not copied. `/ws/pty` provides basic PTY but not the full workspace-aware terminal management MWIDE's frontend expects.

### 7. Bootstrap / Finisher Verification
- **What:** `POST /api/projects/{name}/bootstrap` and `POST /api/projects/{name}/finisher` endpoints exist.
- **Infrastructure:** Route handlers are wired.
- **Blocker:** Not verified to dispatch actual make targets or report accurate pass/fail. Needs integration testing against real project configs.

### 8. Agent Restart Lifecycle
- **What:** `POST /api/agents/{id}/restart` endpoint exists. `agents.json` defines agent configurations.
- **Infrastructure:** Agent CRUD is functional. Process management tracks running agents.
- **Blocker:** Full lifecycle (start → monitor → auto-restart → logs) is partially implemented. No health check polling, no log aggregation.

---

## Architecture Summary

```
control-center/
├── server.py              # FastAPI backend (11,599 lines)
├── index.html             # Zero-build SPA shell
├── static/                # Assets, dev-launcher, hero image
├── modules/
│   ├── agent-execution/   # ATerm copy (TypeScript SPA)
│   ├── workspace-editor/  # MWIDE copy (TypeScript SPA)
│   ├── terminal-console/  # Kernel-native terminal UI
│   ├── project-control/   # Kernel-native governance
│   ├── system-health/     # Kernel-native health monitor
│   └── system-map/        # Self-contained infrastructure map
├── tests/                 # 22 test files, 195 tests
├── SSOT/                  # Single source of truth
├── Issues/                # Active blockers
├── FLOYD.md               # Agent governance contract
├── agents.json            # Agent definitions
└── docs/                  # Release documentation
```

---

## Module Source Manifests

| Module | Source | Status |
|---|---|---|
| Agent Execution | ATerm (`/Volumes/SanDisk1Tb/ATerm/`) | Copied and adapted |
| Workspace Editor | MWIDE (`/Volumes/SanDisk1Tb/MWIDE/`) | Copied and adapted |
| Project Control | Kernel-native | Built for Kernel |
| Terminal Console | Kernel-native | Built for Kernel |
| System Health | Kernel-native | Built for Kernel |
| System Map | Self-contained HTML | Embedded |

Original source applications remain untouched at their canonical paths. The Kernel owns its copied implementations exclusively.

---

*This document reflects the state of the Kernel as of 2026-05-09. For the authoritative architecture record, see `SSOT/control-center_SSOT.md`.*
