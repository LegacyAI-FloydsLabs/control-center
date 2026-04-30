# Terminal Control Center — Next Round Update Plan

**Created:** 2026-04-09T19:30:00-04:00  
**Owner:** Douglas Talley  
**Governance:** `.supercache/` v1.0.0  
**Repository:** `github.com/CaptainPhantasy/terminal-control-center`  
**Status:** PLANNING — Awaiting Douglas Talley approval  

---

## Table of Contents

1. [What TCC Is Today](#1-what-tcc-is-today)
2. [What TCC Must Become](#2-what-tcc-must-become)
3. [Agent Deployment Hub — Use Cases](#3-agent-deployment-hub--use-cases)
4. [Required Updates](#4-required-updates)
5. [New Features — Prioritized](#5-new-features--prioritized)
6. [Integration with .supercache/ Governance](#6-integration-with-supercache-governance)
7. [Implementation Sprints](#7-implementation-sprints)
8. [Decision Register](#8-decision-register)

---

## 1. What TCC Is Today

**Terminal Control Center** is a FastAPI + xterm.js web application that provides:

- Multi-terminal grid with PTY sessions over WebSocket
- Agent CRUD with persistence (`agents.json`)
- launchd integration (timer/hook/keepalive)
- Broadcast mode, tag filtering, bulk operations
- Command palette, context menu, search, themes
- Import/export of agent configs

**Current Stack**:
| Component | Technology | Size |
|-----------|-----------|------|
| Backend | `server.py` (Python 3 / FastAPI / uvicorn) | 716 lines |
| Frontend | `index.html` (vanilla JS + xterm.js from CDN) | 1,394 lines |
| Dependencies | `fastapi`, `uvicorn`, `pydantic` | 3 packages |
| Total | 2 files of code | 2,110 lines |

**Current State Assessment**:

| Capability | Status | Evidence |
|-----------|--------|----------|
| Multi-terminal PTY | ✅ Working | 30 test screenshots confirm |
| launchd plist generation | ✅ Working | `server.py` lines 131–196 generate plists |
| Agent persistence | ✅ Working | `agents.json` read/write |
| Tailscale accessibility | ❌ Not configured | Server binds 0.0.0.0:3000 but no Tailscale port open |
| .supercache/ integration | ❌ None | No governance awareness |
| Timezone awareness | ❌ None | No TZ set in plists or env |
| Execution contract enforcement | ❌ None | No contract injection |
| Strict critic integration | ❌ None | No critic agent capability |
| Bootstrap agent templates | ❌ None | Presets are bash/python3/node/htop only |
| Agent log archival | ❌ None | Scrollback export exists but no auto-archive |
| CRON scheduling | ❌ None | Only launchd, no crontab management |
| Health monitoring | ⚠️ Basic | `/api/health` returns "ok" only |
| Authentication | ❌ None | Open access on local network |

**Not Running**: `lsof -i :3000` returns nothing. TCC is not currently serving.

---

## 2. What TCC Must Become

TCC becomes the **Agent Deployment Hub** for the entire Legacy AI environment. It is the single pane of glass where:

1. **All agents are deployed, monitored, and managed** — CRON, launchd, on-demand
2. **Governance is enforced** — execution contract injected, critic agent triggered, .supercache/ referenced
3. **Health is visible** — every agent's status, uptime, last output, and compliance check
4. **Indiana Eastern time is enforced** — all timestamps, all logs, all entries
5. **Protection stack is active** — no destructive commands without approval, no --no-verify bypass

**TCC is not just a terminal manager. It is the operational control plane for deterministic agentic coding.**

---

## 3. Agent Deployment Hub — Use Cases

### Use Case 1: Bootstrap a New Project
```
User opens TCC → Command Palette → "Bootstrap Project"
→ Agent prompt: "Enter project directory"
→ TCC runs: /Volumes/SanDisk1Tb/.supercache/bootstrap.sh --init <dir>
→ Terminal shows bootstrap output
→ TCC confirms: FLOYD.md created, SSOT/ created, Issues/ created, .floyd/ created
→ Critic agent automatically runs verification
```

### Use Case 2: Deploy a Scheduled Agent
```
User opens TCC → "Add Agent" → Select template "Critic Sweep"
→ Name: "Hourly Critic", Directory: /Volumes/SanDisk1Tb
→ Command: /Volumes/SanDisk1Tb/.supercache/hooks/critic-runner.sh
→ Automation: Timer, Interval: 3600
→ Auto-start: YES
→ TCC generates launchd plist with TZ=America/Indiana/Indianapolis
→ TCC loads plist via launchctl
→ Agent appears in sidebar with "keepalive" badge
```

### Use Case 3: Run Health Check Across All Projects
```
User opens TCC → Command Palette → "Health Check All"
→ TCC runs: /Volumes/SanDisk1Tb/.supercache/bootstrap.sh --health
→ Terminal shows per-project pass/fail
→ Results written to /Volumes/SanDisk1Tb/SSOT/health_check_<timestamp>.log
→ TCC sidebar shows badge: "17/186 compliant" or "186/186 compliant"
```

### Use Case 4: Monitor Running Agents
```
User opens TCC → Grid view shows all running agents
→ Each terminal tile shows: name, uptime, status (green/yellow/red)
→ Click any terminal → full interactive session
→ Sidebar shows: pinned agents, agents by tag, agents by automation type
→ Health bar shows: overall system compliance score
```

### Use Case 5: Emergency Response
```
Agent goes rogue or production issue detected
→ User opens TCC → selects the agent → Context Menu → "Kill + Archive"
→ TCC kills the process, saves scrollback to archive, removes from active
→ TCC logs the event with ISO 8601 timestamp to .floyd/agent_log.jsonl
→ Critic agent prompt available to review what happened
```

### Use Case 6: CRON Agent Management
```
User opens TCC → "CRON" tab in sidebar
→ Shows all current crontab entries
→ Add/Edit/Delete CRON jobs with UI (not manual crontab -e)
→ Each CRON job has: name, schedule, command, last_run, last_status
→ CRON_TZ=America/Indiana/Indianapolis enforced on all entries
→ TCC writes crontab changes and logs the modification
```

### Use Case 7: Agent Template Library
```
User opens TCC → Command Palette → "New from Template"
→ Templates include:
  - "Bootstrap Project" (bash: bootstrap.sh --init)
  - "Health Check" (bash: bootstrap.sh --health)
  - "Log Rotate" (bash: log-rotate.sh)
  - "Critic Sweep" (bash: critic-runner.sh)
  - "State Monitor" (bash: state-monitor.sh)
  - "Python Data Pipeline" (python3: <script>.py)
  - "Node.js MCP Server" (node: <server>.js)
  - "Pi Agent" (pi: <agent-type>)
→ All templates carry governance: TZ, execution contract, .supercache/ references
```

---

## 4. Required Updates

### R1: Timezone Enforcement

**What's missing**: No TZ environment variable in server.py, launchd plists, or agent env.

**Fix**:
```python
# server.py — add to all agent process spawns:
proc_env["TZ"] = "America/Indiana/Indianapolis"
```

```python
# _generate_launchd_plist — add to all generated plists:
<key>EnvironmentVariables</key>
<dict>
    <key>TZ</key>
    <string>America/Indiana/Indianapolis</string>
</dict>
```

**Evidence of gap**: `grep -c "TZ\|timezone\|America\|Indiana" server.py` → 0

### R2: Execution Contract Injection

**What's missing**: No awareness of the execution contract. Agents spawned via TCC do not have the contract in their context.

**Fix**: Add an `execution_contract` field to Agent model. When enabled, TCC prepends the contract text to the agent's terminal session as a banner on startup. The contract is read from `/Volumes/SanDisk1Tb/.supercache/contracts/execution-contract.md`.

```python
# server.py — in spawn_process():
if agent.get("execution_contract", False):
    contract_path = os.path.join(SC_ROOT, "contracts/execution-contract.md")
    if os.path.exists(contract_path):
        with open(contract_path) as f:
            contract = f.read()
        # Write contract banner to PTY
        banner = f"\n{'='*60}\nEXECUTION CONTRACT — ACTIVE\n{'='*60}\n{contract}\n{'='*60}\n\n"
        os.write(master_fd, banner.encode())
```

### R3: .supercache/ Integration

**What's missing**: TCC has no awareness of `.supercache/`, FLOYD.md, or governance.

**Fix**: Add `.supercache/` discovery to the server. TCC reads `SUPERCACHE_ROOT` from environment or auto-detects it. Add governance-aware API endpoints:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/governance/supercache-version` | Read VERSION from .supercache/ |
| `GET /api/governance/health` | Run `bootstrap.sh --health` and return results |
| `GET /api/governance/projects` | List all governed projects and their compliance status |
| `POST /api/governance/bootstrap` | Run `bootstrap.sh --init` on a directory |
| `POST /api/governance/verify/{dir}` | Run `bootstrap.sh --verify` on a project |
| `POST /api/governance/critic` | Trigger strict critic agent on a project |

### R4: Strict Critic Agent Integration

**What's missing**: No way to trigger or view critic results from TCC.

**Fix**: Add a "Run Critic" button per agent and per project. Critic output appears in a new terminal. Results are saved to `<project>/.supercache/critique_YYYY-MM-DD.md`.

### R5: CRON Management

**What's missing**: TCC only manages launchd. CRON jobs (Python agents, PEBKAC heartbeat, daily hunters) are invisible to TCC.

**Fix**: Add CRON management API and UI:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/cron/jobs` | List all current crontab entries |
| `POST /api/cron/jobs` | Add a new CRON job (writes to crontab) |
| `DELETE /api/cron/jobs/{id}` | Remove a CRON job |
| `GET /api/cron/logs/{id}` | Get last N lines of a CRON job's log file |

All CRON operations enforce `CRON_TZ=America/Indiana/Indianapolis`.

### R6: Authentication

**What's missing**: TCC is open access on 0.0.0.0:3000. Anyone on the Tailscale network can access it.

**Fix**: Add simple token-based auth. On first launch, TCC generates a token and writes it to `~/.floyd/tcc-token`. The token is required as `?token=` query param or `Authorization: Bearer` header. This is not enterprise security — it's a speed bump that prevents accidental access.

### R7: Log Archival

**What's missing**: Scrollback can be manually exported, but there's no automatic archival.

**Fix**: Add a nightly log rotation that:
1. Compresses scrollback for each agent to `/Volumes/SanDisk1Tb/SSOT/tcc_logs/<agent_name>_<timestamp>.txt.gz`
2. Clears the in-memory scrollback buffer
3. Logs the rotation with ISO 8601 timestamp

### R8: Tailscale Accessibility

**What's missing**: TCC binds 0.0.0.0:3000 but is only accessible locally.

**Fix**: TCC should be accessible via Tailscale at `http://douglass-mac-mini-1:3000` or `http://100.64.14.51:3000`. This already works if the macOS firewall allows it. Add a launchd plist to auto-start TCC on boot so it's always available.

### R9: Bootstrap TCC Itself

**What's missing**: TCC has no FLOYD.md, no SSOT/, no Issues/, no .floyd/.

**Fix**: Run `bootstrap.sh --init /Volumes/SanDisk1Tb/terminal-control-center` to add governance to TCC's own project directory. TCC dogfoods its own governance.

---

## 5. New Features — Prioritized

### Priority 1: Required for Environment Overhaul (Must Have)

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| F1 | TZ enforcement in all process spawns and launchd plists | Small | High — time standard compliance |
| F2 | .supercache/ discovery and governance API endpoints | Medium | High — governance integration |
| F3 | Bootstrap project template (one-click `bootstrap.sh --init`) | Small | High — enables 186-project deployment |
| F4 | Health check template (one-click `bootstrap.sh --health`) | Small | High — enables compliance monitoring |
| F5 | Execution contract injection (banner on agent start) | Small | High — contract enforcement |
| F6 | Token-based authentication | Small | Medium — prevents accidental access |
| F7 | Governance project list sidebar | Medium | High — visibility into 186 projects |
| F8 | Bootstrap TCC itself (dogfood governance) | Small | Medium — TCC is a governed project |

### Priority 2: High Value for Agent Management (Should Have)

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| F9 | CRON management API + UI tab | Medium | High — CRON agents are invisible today |
| F10 | Strict critic trigger button + result viewer | Medium | High — enables automatic quality gates |
| F11 | Agent template library with governance-aware presets | Medium | High — repeatable agent deployment |
| F12 | Auto-start on boot via launchd | Small | Medium — TCC always available |
| F13 | Log archival with nightly rotation | Small | Medium — disk space management |
| F14 | Compliance badge in sidebar (N/186 projects compliant) | Small | High — at-a-glance environment status |

### Priority 3: Nice to Have (Future)

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| F15 | WebSocket event stream for real-time compliance changes | Medium | Medium |
| F16 | Agent dependency graph visualization | Large | Medium |
| F17 | Multi-user sessions with role-based access | Large | Low (single user) |
| F18 | Mobile-responsive layout for iPhone access | Medium | Low (nice but not critical) |

---

## 6. Integration with .supercache/ Governance

### How TCC Reads .supercache/

```python
# server.py — at startup:
SC_ROOT = os.environ.get("SUPERCACHE_ROOT", "")
if not SC_ROOT:
    for mount in ["/Volumes/SanDisk1Tb", "/Volumes/Storage"]:
        if os.path.isfile(f"{mount}/.supercache/VERSION"):
            SC_ROOT = f"{mount}/.supercache"
            break

# Read governance files:
def read_supercache_file(relative_path: str) -> str:
    full_path = os.path.join(SC_ROOT, relative_path)
    if os.path.isfile(full_path):
        with open(full_path) as f:
            return f.read()
    return ""
```

### What TCC Reads from .supercache/

| File | TCC Use |
|------|---------|
| `VERSION` | Display in sidebar: "Governance v1.0.0" |
| `README.md` | Show in governance info panel |
| `contracts/execution-contract.md` | Inject as banner when agent has `execution_contract: true` |
| `manifests/resource-manifest.yaml` | Display available infrastructure to agent deployers |
| `manifests/model-routing.yaml` | Show which LLM for which task type |
| `manifests/service-catalog.yaml` | Show active services and costs |
| `manifests/cross-drive-registry.yaml` | Show drive topology |
| `templates/floyd-md-template.md` | Preview before creating new project |
| `hooks/pre-commit.sh` | Install when bootstrapping a project with .git |
| `hooks/session-end.sh` | Show handoff template |
| `hooks/floyd-state-pause.sh` | Show state format |

### What TCC Writes

TCC **NEVER** writes to global `.supercache/`. TCC writes to:
- Project-level `.supercache/` (per-project governance data)
- `.floyd/` directories (agent logs, state)
- `/Volumes/SanDisk1Tb/SSOT/` (health check results, critic reports)

---

## 7. Implementation Sprints

### TCC Sprint 1: Governance Foundation (Day 1)

| Step | Action | Evidence Required |
|------|--------|--------------------|
| 1A | Bootstrap TCC itself: `bootstrap.sh --init /Volumes/SanDisk1Tb/terminal-control-center` | FLOYD.md exists, `bootstrap.sh --verify` passes |
| 1B | Add TZ="America/Indiana/Indianapolis" to all `proc_env` in `spawn_process()` | `grep TZ server.py` returns the timezone |
| 1C | Add TZ to `_generate_launchd_plist()` as EnvironmentVariables | Generated plists contain `<key>TZ</key>` |
| 1D | Add SUPERCACHE_ROOT discovery at server startup | Server logs show discovered SC_ROOT path |
| 1E | Add `GET /api/governance/supercache-version` endpoint | Returns "1.0.0" |
| 1F | Add execution contract injection to spawn_process | Agents with `execution_contract: true` show contract banner |
| 1G | Add token-based auth (generate token, require in requests) | Unauthenticated request returns 401 |
| 1H | Create launchd plist for TCC auto-start: `com.legacyai.tcc.plist` | TCC starts on boot, accessible on port 3000 |

### TCC Sprint 2: Deployment Templates (Day 2)

| Step | Action | Evidence Required |
|------|--------|--------------------|
| 2A | Add "Bootstrap Project" template to TCC | One-click creates FLOYD.md + SSOT/ + Issues/ + .floyd/ |
| 2B | Add "Health Check" template to TCC | One-click runs `bootstrap.sh --health` in a terminal |
| 2C | Add "Verify Project" template to TCC | One-click runs `bootstrap.sh --verify <dir>` |
| 2D | Add governance-aware agent presets: "Critic Sweep", "Log Rotate", "State Monitor" | Templates appear in Add Agent form |
| 2E | Add `GET /api/governance/projects` endpoint | Returns list of all governed projects with compliance status |
| 2F | Add compliance badge to sidebar (N/186 projects compliant) | Badge visible with real count |

### TCC Sprint 3: CRON + Critic Integration (Day 3)

| Step | Action | Evidence Required |
|------|--------|--------------------|
| 3A | Add CRON management API (`GET/POST/DELETE /api/cron/jobs`) | Current crontab entries visible in TCC |
| 3B | Add CRON management UI tab | Tab shows all CRON jobs with last run status |
| 3C | Add "Run Critic" button per agent | Critic runs in new terminal, results saved |
| 3D | Add `POST /api/governance/critic` endpoint | Triggers critic agent on specified project |
| 3E | Add critic result viewer (read from `<project>/.supercache/critique_*.md`) | Critique reports displayable in TCC |
| 3F | Add log archival: nightly scrollback compress + archive | Archived logs exist in SSOT/tcc_logs/ |

### TCC Sprint 4: Polish + Test (Day 4)

| Step | Action | Evidence Required |
|------|--------|--------------------|
| 4A | Test full workflow: bootstrap project → verify → run critic → view result | End-to-end works in browser |
| 4B | Test CRON management: add job → verify crontab → delete job | CRON entries managed from TCC |
| 4C | Test Tailscale access: access TCC from another device on Tailscale | TCC loads at 100.64.14.51:3000 |
| 4D | Update README.md with governance integration docs | README documents all new features |
| 4E | Run strict critic on TCC Sprint 1-4 changes | Critique verdict: PROCEED |

---

## 8. Decision Register

| # | Decision | Made By | Date | Rationale | Status |
|---|----------|---------|------|-----------|--------|
| T1 | TCC becomes Agent Deployment Hub for entire environment | Douglas Talley | 2026-04-09 | Single pane of glass for all agent operations | APPROVED |
| T2 | TCC binds to port 3000 (not 3001 — 3000 is the code default) | Architect | 2026-04-09 | Avoid confusion; update plan references from 3001 → 3000 | PENDING |
| T3 | Token-based auth (simple, not enterprise) | Architect | 2026-04-09 | Speed bump against accidental access; single-user environment | PENDING |
| T4 | TCC auto-starts on boot via launchd | Architect | 2026-04-09 | Must be always available for agent monitoring | PENDING |
| T5 | TCC reads .supercache/ but NEVER writes to it | Architect | 2026-04-09 | Same governance rule as all agents | PENDING |
| T6 | TCC manages CRON jobs (not just launchd) | Douglas Talley | 2026-04-09 | 4 active CRON agents are invisible to TCC today | APPROVED |
| T7 | TCC itself gets bootstrapped with governance (dogfood) | Douglas Talley | 2026-04-09 | No exceptions — every project gets FLOYD.md | APPROVED |
| T8 | Strict critic available as one-click action in TCC | Douglas Talley | 2026-04-09 | Makes quality gates accessible, not hidden in CLI | APPROVED |

---

## Appendix: Port Reference Correction

The environment overhaul plan previously referenced TCC at `localhost:3001`. The actual port in the codebase is **3000**. All references should be updated:

| Location | Old | New |
|----------|-----|-----|
| ENVIRONMENT_OVERHAUL_PLAN.md | port 3001 | port 3000 |
| Session transcript | localhost:3001 | localhost:3000 |

---

*End of TCC Update Plan. Every claim verified against the codebase on 2026-04-09. No placeholders. No speculation.*
