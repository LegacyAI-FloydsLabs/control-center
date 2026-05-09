# Floyd's Unified Command Kernel — SSOT (Single Source of Truth)

**Created:** 2026-05-01T01:16:09-0400
**Last Updated:** 2026-05-09T11:10:00-0400
**Governance:** .supercache/ v1.7.0
**Project path:** `/Volumes/Storage/Legacy Agents/control-center/`
**Product name:** Floyd's Unified Command Kernel (F.U.C.K.)
**Implementation directory:** `control-center/`
**Acronym:** F.U.C.K. — intentional branding, Floyd's Labs voice

---

## Authority

This document is the **single source of truth** for F.U.C.K.'s architecture, product identity, integration model, beta-release requirements, and remaining work.

If any roadmap, plan, README, inherited Terminal Control Center document, MWIDE port note, iframe note, launcher note, or module-specific document conflicts with this SSOT, this SSOT wins. Conflicting documents are quarantine candidates under `.supercache/contracts/repo-sanitation.md`.

The original source applications remain standalone products. F.U.C.K. receives copied source code from those applications and turns those copies into Kernel-owned internal capabilities.

---

## Verification Sweep Protocol

When reading this SSOT for work:

1. Verify relevant facts against files, commands, or runtime behavior before relying on them.
2. Append each verified fact to the Verification Log with timestamp, section, evidence, and confidence.
3. If a fact cannot be verified to 100%, mark it `UNVERIFIED` and add an entry to `Issues/control-center_ISSUES.md`.
4. Do not proceed from unverified assumptions.

---

## Current State

**Phase:** Active construction toward beta release
**Status:** Beta construction — 179 tests passing, WebSocket bridges wired, ATerm PTY integration live
**Last Agent Session:** 2026-05-09T11:10:00-0400
**Runtime posture:** single-user localhost during beta construction
**Primary app port:** 10527
**SSOT status:** canonical as of this update

---

## Product Identity

Floyd's Unified Command Kernel (F.U.C.K.) is one monoapplication consolidating Legacy AI capabilities. It is NOT a shell around older apps.

The Kernel owns:

- product name, acronym, and brand voice
- routes, ports, UI labels, navigation
- state model, persistence, tests, documentation, release commit

### Brand Identity

- **Title**: Floyd's Unified Command Kernel
- **Acronym**: F.U.C.K.
- **Title styling**: F, U, C, K letters bold with Tokyo Night CSS color cycling (`@keyframes fuck-color-sync`)
- **Hero image**: `static/hero-text.png` (36231 bytes, 1728x128 PNG)
- **Brand voice**: Floyd's Labs — builder-first, anti-corporate, caffeinated, technically competent

---

## Source-App Copy Rule

When integrating source applications into F.U.C.K.:

1. **COPY** the source application code into Kernel-owned module paths.
2. **NEVER** modify original source applications.
3. Adapt the copied code to work within F.U.C.K.'s architecture (same DOM, same origin).
4. Originals live at:
   - MWIDE: `/Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE/` — untouched
   - ATerm: `/Volumes/SanDisk1Tb/ATerm/` — untouched
   - Dev-Launcher: `/Volumes/Storage/Development/dev-launcher/` — untouched

---

## Non-Replacement Rule

Original source applications are standalone reusable products. F.U.C.K. owns its copied implementation, not the original. This rule is absolute.

---

## Naming and Port Rules

| Source/internal provenance name     | Kernel-facing capability name |
| ----------------------------------- | ----------------------------- |
| Terminal Control Center / TCC       | Terminal Console              |
| MWIDE / mobile-web-IDE              | Workspace Editor              |
| FLOYD CURSE'M / ATerm               | Agent Execution               |
| Infrastructure Map                  | System Map                    |
| Governance Dashboard / ControlBoard | Project Control               |
| System Health                       | System Health                 |
| Dev-Launcher                        | Dev Launcher                  |
| Spend Watch (self-contained)        | Spend Watch                   |
| Mac Cleanup Report (self-contained) | Mac Cleanup                   |

Port rules:

- Kernel primary app port: **10527**
- Original app ports are not inherited as final Kernel ports.
- All capabilities served from port 10527.

---

## Architecture Facts

### Stack

- **Primary language:** Python + JavaScript
- **Framework:** FastAPI backend, vanilla JavaScript frontend
- **Runtime:** Python 3.14 with uvicorn, launched via launchd
- **Frontend:** Zero-build `index.html` with dynamic JS/CSS injection for module SPAs
- **Terminal transport:** WebSocket PTY, xterm.js
- **Persistence:** JSON files, `.floyd/` runtime artifacts, `~/.config/mwide-vault.json`
- **Launchd:** `~/Library/LaunchAgents/com.legacyai.tcc.plist` on port 10527

### Module Architecture

Each module has a source manifest and follows the copy-in pattern:

| Module           | Path                               | Source copied from                                          |
| ---------------- | ---------------------------------- | ----------------------------------------------------------- |
| Project Control  | `modules/project-control/`         | Kernel-native                                               |
| Terminal Console | `modules/terminal-console/`        | Kernel-native                                               |
| Workspace Editor | `modules/workspace-editor/source/` | MWIDE (`/Volumes/SanDisk1Tb/MWIDE/`)                        |
| Agent Execution  | `modules/agent-execution/source/`  | ATerm (`/Volumes/SanDisk1Tb/ATerm/`)                        |
| System Health    | `modules/system-health/`           | Kernel-native                                               |
| System Map       | `modules/system-map/`              | Self-contained HTML                                         |
| Dev Launcher     | `static/dev-launcher/`             | Dev-Launcher (`/Volumes/Storage/Development/dev-launcher/`) |

### Integration Model

**Zero iframes for Kernel-native modules.** MWIDE, ATerm, and System Map load via:

- Dynamic `<script type="module">` and `<link>` injection into main document
- Unique mount targets: `#mwide-root`, `#aterm-root`, Shadow DOM for System Map

**Iframe permission granted for self-contained standalone pages** (Dev-Launcher Vite SPA, Infrastructure Map, Spend Watch, Mac Cleanup) — these are full applications with their own routing, JS bundles, and CSS variables that require DOM isolation. User decision recorded 2026-05-09.

### WebSocket Endpoints

| Endpoint         | Protocol                             | Purpose                                           |
| ---------------- | ------------------------------------ | ------------------------------------------------- |
| `/ws/pty`        | JSON-PTY (MWIDE TerminalPane)        | Real PTY spawn/stream with session resume         |
| `/ws/collab`     | Room-based fan-out (MWIDE collab.ts) | Real-time document sync                           |
| `/ws/events`     | Push events (ATerm useEvents.ts)     | Session lifecycle broadcasting                    |
| `/ws/{agent_id}` | Raw PTY bytes (catch-all)            | Sidebar agent terminals + ATerm session terminals |

### API Surface

- **Governance**: `/api/projects`, `/api/quarantine-summary`, `/api/tags`
- **Filesystem**: `/api/fs/home`, `/api/fs/list`, `/api/fs/read`, `/api/fs/write`, `/api/fs/mkdir`, `/api/fs/rename`, `/api/fs/remove`, `/api/fs/stat`, `/api/fs/serve`, `/api/fs/browse`
- **Vault**: `/api/vault/list`, `/api/vault/set`, `/api/vault/delete`
- **ATerm**: `POST /api/do` (19 actions)
- **Bootstrap/Finisher**: `POST /api/projects/{name}/bootstrap`, `POST /api/projects/{name}/finisher`
- **Health**: `/api/system-health`, `/api/system-health/rescan`
- **LLM**: `/api/llm/stream`, `/api/llm/test`
- **Git**: `/api/git-proxy/{path}`
- **Agents**: `/api/agents`, `/api/agents/{id}`, `/api/agents/{id}/restart`

### Nav Tabs (11 total)

Project Control · Terminal Console · Dual Console · Workspace · Workspace Editor · System Health · System Map · Agent Execution · Dev Launcher · Spend Watch · Mac Cleanup

---

## Key Decisions

| Date       | Decision                                                      | Rationale                                                                    | Decided By     |
| ---------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------- |
| 2026-05-09 | Product renamed to Floyd's Unified Command Kernel (F.U.C.K.)  | User branding decision                                                       | Douglas Talley |
| 2026-05-09 | Iframe permission granted for self-contained standalone pages | Dev-Launcher, Spend Watch, Mac Cleanup are full apps requiring DOM isolation | Douglas Talley |
| 2026-05-09 | file:// links replaced with /api/fs/serve?path=               | Browsers block file:// from http:// origin                                   | Agent          |
| 2026-05-09 | DeepSeek API key vaulted                                      | Key stored in vault for LLM proxy use                                        | Agent          |
| 2026-05-03 | Source app integration = copy actual code into Kernel         | User: "copy" means paste original code, not rewrite                          | Douglas Talley |
| 2026-05-03 | Original applications remain untouched                        | Source apps are standalone products                                          | Douglas Talley |
| 2026-05-03 | Beta release = one coherent commit                            | User wants one new application commit                                        | Douglas Talley |

---

## Test Status

- **179 tests passing, 0 failed, 1 skipped** (`test_proof_floyd`)
- WebSocket behavioral tests: `/ws/pty`, `/ws/collab`, `/ws/events`
- ATerm PTY integration: create → start → run → read → stop → delete with real PTY
- MWIDE API: filesystem, vault, LLM proxy, git proxy
- Governance: project scanning, quarantine, tags, links

---

## Remaining Work

### Completion Fortress Items

| #   | Item                                                  | Status                       |
| --- | ----------------------------------------------------- | ---------------------------- |
| 1   | Verify all 11 nav tabs render correctly               | Pending browser verification |
| 2   | Verify Dev-Launcher iframe loads                      | Pending browser verification |
| 3   | Verify Spend Watch Shadow DOM renders                 | Pending browser verification |
| 4   | Verify Mac Cleanup Shadow DOM renders                 | Pending browser verification |
| 5   | Verify governance links navigate to /api/fs/serve     | Pending browser verification |
| 6   | Verify Bootstrap dispatches actually run make targets | Pending                      |
| 7   | Verify Finisher reports accurate pass/fail            | Pending                      |
| 8   | Verify System Map Shadow DOM renders                  | Pending browser verification |
| 9   | BETA-09: Release hygiene commit                       | Blocked on all above         |

---

## Verification Log (append-only)

| Timestamp        | Section             | Evidence                                                   | Confidence |
| ---------------- | ------------------- | ---------------------------------------------------------- | ---------- |
| 2026-05-09T11:10 | WebSocket endpoints | `pytest tests/test_websockets.py` — 5/5 pass               | 100%       |
| 2026-05-09T11:10 | ATerm PTY flow      | create→start→run→read→stop→delete: all ok, real PTY output | 100%       |
| 2026-05-09T11:10 | /api/fs/serve       | curl returns FLOYD.md content with 200                     | 100%       |
| 2026-05-09T11:10 | Dev-Launcher static | `/dev-launcher/` returns 200, JS/CSS paths rewritten       | 100%       |
| 2026-05-09T11:10 | Vault               | DeepSeek key stored, `/api/vault/list` shows 3 ids         | 100%       |

---

## Change Log (append-only)

| Date       | Change                                                                                                                                                                                                               | Agent  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2026-05-09 | Full SSOT rewrite: renamed product to F.U.C.K., added 3 new tabs (Dev Launcher, Spend Watch, Mac Cleanup), documented WebSocket endpoints, updated architecture, recorded iframe permission for self-contained pages | Claude |
| 2026-05-03 | Initial SSOT creation                                                                                                                                                                                                | Claude |

---

## Mandatory Execution Contract

For EACH requested item:

1. Show exact action taken
2. Show direct evidence (file/line/command/output)
3. Show verification result
4. Mark status only after proof

## Forbidden behaviors

- Declaring completion without evidence
- Collapsing multiple requested items into one vague summary
- Skipping failed steps without explicit blocker report
- Deleting instead of quarantining

## Required output structure

A) Requested items checklist
B) Per-item evidence ledger
C) Verification receipts
D) Completeness matrix

## Hard gate

If any requested item has no evidence row, final status MUST be INCOMPLETE.
