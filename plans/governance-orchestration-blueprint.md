# Blueprint: Governance Orchestration Dashboard & Agent Fleet System

**Plan ID:** `GOV-ORCH-001`
**Created:** 2026-04-29T11:30:00-0400
**Objective:** Build governance orchestration dashboard and agent fleet system to bring all SanDisk1Tb projects into governance, fill repository reports autonomously, and dispatch finisher swarms to reach Beta Release on unfinished projects.
**Status:** DRAFT — Pending adversarial review

---

## Pre-Flight Context

### Existing Assets (do not rebuild)

| Asset | Path | Role |
|---|---|---|
| Repository report template | `/Volumes/Storage/Legacy Agents/repository_report_template.md` | Per-project data schema |
| Team builder | `/Volumes/Storage/Legacy Agents/build_teams_from_report.py` | Generates agent team configs from reports |
| Team architect | `/Volumes/Storage/Legacy Agents/legacy-team-architect.py` | Advanced team construction |
| Team Floyd Orchestrator prompt | `/Users/douglastalley/AGENTS/agents/Team Floyd Orchestrator (Code-Only SSOT + Deterministic Worker Swarm).md` | Finisher swarm coordinator |
| Governance layer | `/Volumes/SanDisk1Tb/.supercache/` | Contracts, templates, verify harness |
| Project inventory | `Legacy_Agents/SSOT/Legacy_Agents_SSOT.md` (SanDisk1Tb section) | 47 directories enumerated |
| Blueprint skill | `/Volumes/SanDisk1Tb/skillsdump/library/blueprint/SKILL.md` | Plan methodology |

### Current State Facts

- **SanDisk1Tb**: 47 non-empty directories → 9 governed (have `.supercache_version`), 5 candidates (have FLOYD.md/CLAUDE.md but no stamp), 33 unassessed
- **Governance version**: 1.5.0 canonical at `.supercache/VERSION`
- **All 9 stamped projects** are at v1.5.0 — but their FLOYD.md governance headers are drifted (ATerm shows v1.4.0, GEMINI shows v1.2.0, etc.)
- **Storage drive**: 12 governed projects, ~149 ungoverned directories (Phase 2)
- **Drift problem**: `.supercache_version` stamp ≠ FLOYD.md governance header on several projects
- **No project has a filled repository_report_template.md** — all are template stubs

### Target End State

1. **HTML Dashboard** at `/Volumes/Storage/Legacy Agents/dashboard.html` — live, persistent, exportable to Markdown, with `file://` links
2. **Every SanDisk1Tb project** has a filled `repository_report.json` in its `SSOT/` directory
3. **Dashboard reflects** per-project: governance status, completion %, team members deployed, progress, tasks remaining, test results
4. **Governance entry contract** exists and is enforced — any agent entering a directory reads it first
5. **Finisher dispatch** works from dashboard → Team Floyd Orchestrator swarm finishes projects to Beta Release
6. **Storage drive** same treatment after SanDisk1Tb is complete

---

## Phase 0 — Governance Entry Contract (Foundation)

Every other phase depends on this. No agent can bootstrap a project or fill a report without this contract existing and being read.

### Step 0.1: Create `GOVERNANCE-ENTRY.md`

**Context brief:** Write a new governance contract that lives in `.supercache/contracts/` (read-only for agents) and is referenced by every project's `FLOYD.md`. This contract mandates what happens when an agent first enters an ungoverned directory.

**What it must contain:**
1. **Entry detection rule**: If `.floyd/.supercache_version` is missing OR `SSOT/repository_report.json` is missing/incomplete → ENTRY PROTOCOL triggered
2. **Bootstrap checklist**: What files to create (`.floyd/`, `SSOT/`, `FLOYD.md`, `CLAUDE.md`)
3. **Repository report mandate**: Fill `SSOT/repository_report.json` using the template at `/Volumes/Storage/Legacy Agents/repository_report_template.md`
4. **Verification rounds**: Minimum 3 critic-check rounds with deterministic verification before report is accepted
5. **Governance stamp**: After report accepted, create `.floyd/.supercache_version` at current canonical version
6. **Dashboard update**: Report file path + completion triggers dashboard refresh
7. **Forbidden**: Moving to implementation before report is verified

**Target file:** `/Volumes/SanDisk1Tb/.supercache/contracts/governance-entry.md`
**Template reference:** `/Volumes/SanDisk1Tb/.supercache/templates/` for format compliance
**Depends on:** Nothing (foundation step)
**Verification:** File exists, matches `.supercache/` contract format, all 7 sections present

### Step 0.2: Update `agent-contract.md` to reference governance entry

**Context brief:** The existing `contracts/agent-contract.md` at v1.5.0 must reference the new governance entry contract so agents reading it know the entry protocol exists.

**Changes needed:**
- Add `GOVERNANCE-ENTRY.md` to the "Before You Start" reading list
- Add entry protocol trigger description to the agent contract

**Target file:** `/Volumes/SanDisk1Tb/.supercache/contracts/agent-contract.md`
**Depends on:** Step 0.1
**Verification:** `grep -n "governance-entry" contracts/agent-contract.md` returns a match

### Step 0.3: Create `REPOSITORY-REPORT-SPEC.md`

**Context brief:** Write the deterministic specification for filling out repository reports. This is NOT the template — it's the specification that agents follow to produce a verified, accurate report. It defines how each field is determined from code evidence alone.

**What it must contain:**
1. **Field-by-field evidence rules**: For `completion_percentage`, how to calculate from codebase (files with implementations ÷ total planned files, git history, etc.)
2. **Tech stack detection**: How to read `package.json`, `go.mod`, `pyproject.toml`, etc. and report accurately
3. **Complexity scoring rubric**: 1-10 scale with objective criteria (file count, dependency count, architecture patterns)
4. **Critic-check protocol**: After filling report, agent must re-read every field and verify against code evidence. Three rounds minimum. Each round produces a diff of corrections.
5. **Acceptance criteria**: When a report is "verified" — no field can be "guessed" or "estimated" without evidence citation

**Target file:** `/Volumes/SanDisk1Tb/.supercache/contracts/repository-report-spec.md`
**Depends on:** Nothing
**Verification:** All 12 template fields have evidence rules defined

### Phase 0 Gate

| Gate | Requirement |
|---|---|
| GOVERNANCE-ENTRY.md exists | `test -f /Volumes/SanDisk1Tb/.supercache/contracts/governance-entry.md` |
| agent-contract.md references it | `grep -q "governance-entry" /Volumes/SanDisk1Tb/.supercache/contracts/agent-contract.md` |
| REPOSITORY-REPORT-SPEC.md exists | `test -f /Volumes/SanDisk1Tb/.supercache/contracts/repository-report-spec.md` |

---

## Phase 1 — HTML Dashboard (Visualization Layer)

### Step 1.1: Build dashboard.html

**Context brief:** Create a single, self-contained HTML file that reads the file system (via embedded JSON data + `file://` links) and renders the governance registry. No server, no build step, no framework — pure HTML/CSS/JS that opens in any browser.

**What it must contain:**
1. **Summary header**: Total projects, governed count, ungoverned count, drift count, avg completion %
2. **Per-project expandable cards**: Click to expand → shows all repository report fields, governance status, file links
3. **Governance status badge**: Green (governed + aligned), Yellow (governed + drifted), Red (ungoverned), Gray (non-project)
4. **file:// links** to: FLOYD.md, SSOT, repository_report.json, project root
5. **Export to Markdown button**: Generates a markdown version of current state and triggers download
6. **Data source**: Loads from `dashboard-data.json` (generated by refresh script) — keeps HTML static and data separate
7. **Auto-refresh indicator**: Shows when data was last refreshed and a "stale" warning if >24 hours
8. **Embedded apps section**: Links/iframes to team builder script output, orchestrator dispatch controls

**Target file:** `/Volumes/Storage/Legacy Agents/dashboard.html`
**Data file:** `/Volumes/Storage/Legacy Agents/dashboard-data.json`
**Depends on:** Phase 0 complete, project inventory known
**Verification:** Open in browser → shows all 47 SanDisk1Tb directories → expand card shows fields → export generates valid .md

### Step 1.2: Build refresh-registry.sh (data generator)

**Context brief:** A read-only shell script that scans all governed drives, reads `.supercache_version` stamps, reads `repository_report.json` files, and generates `dashboard-data.json`. This is the "realtime" engine — run it, dashboard updates.

**What it must do:**
1. Scan `/Volumes/SanDisk1Tb/*/` (and later `/Volumes/Storage/*/`) for directories
2. For each: check `.floyd/.supercache_version`, `FLOYD.md` headers, `SSOT/repository_report.json`
3. Categorize: GOVERNED, CANDIDATE, NON-PROJECT, UNASSESSED
4. Output `dashboard-data.json` with full project entries
5. Never write to `.supercache/` or any project directory
6. Timestamp the output

**Target file:** `/Volumes/Storage/Legacy Agents/scripts/refresh-registry.sh`
**Depends on:** Phase 0 complete
**Verification:** `bash scripts/refresh-registry.sh && test -f dashboard-data.json && python3 -c "import json; json.load(open('dashboard-data.json'))"` succeeds

### Phase 1 Gate

| Gate | Requirement |
|---|---|
| dashboard.html opens in browser | `open /Volumes/Storage/Legacy\ Agents/dashboard.html` renders correctly |
| refresh-registry.sh runs | `bash scripts/refresh-registry.sh` exits 0, produces valid JSON |
| Export to .md works | Click export in dashboard → valid Markdown file downloads |

---

## Phase 2 — Bootstrap Contract & Agent Fleet Dispatch

### Step 2.1: Create bootstrap worker prompt

**Context brief:** Using the Team Floyd Orchestrator template, create a specialized worker prompt for the "Project Bootstrapper" — the agent that enters an ungoverned directory, follows GOVERNANCE-ENTRY.md, creates the required files, fills the repository report with critic-check verification, and stamps governance.

**What it must contain:**
1. Worker role: "Project Bootstrapper & Repository Report Specialist"
2. Allowed actions: read, grep, glob, bash (read-only scan), edit (SSOT + .floyd + FLOYD.md only)
3. Forbidden: write to `.supercache/`, modify source code, skip verification rounds
4. Task packet: enter directory → read GOVERNANCE-ENTRY.md → bootstrap → fill report → critic-check 3 rounds → stamp
5. Evidence requirements per the Team Floyd Orchestrator contract

**Target file:** `/Volumes/Storage/Legacy Agents/prompts/bootstrap-worker.md`
**Depends on:** Phase 0 complete
**Verification:** Prompt contains all required sections from orchestrator template

### Step 2.2: Create dispatch protocol

**Context brief:** The protocol for YOU (Douglas) to dispatch bootstrap agents. From the dashboard, you identify ungoverned projects → copy the bootstrap worker prompt → run it in a fresh agent context pointing at that directory.

**What it must contain:**
1. How to read the dashboard to identify dispatch candidates
2. Exact copy-paste command/action to dispatch a bootstrap agent
3. How to verify the agent completed successfully (check dashboard for updated status)
4. Dispatch priority order: CANDIDATE projects first (they have FLOYD.md already), then UNASSESSED

**Target file:** `/Volumes/Storage/Legacy Agents/protocols/dispatch-protocol.md`
**Depends on:** Phase 1, Step 2.1
**Verification:** Protocol document exists, each step is actionable

### Phase 2 Gate

| Gate | Requirement |
|---|---|
| Bootstrap worker prompt exists | `test -f prompts/bootstrap-worker.md` |
| Dispatch protocol exists | `test -f protocols/dispatch-protocol.md` |
| At least one CANDIDATE project bootstrapped | Dashboard shows ≥1 new GOVERNED entry |

---

## Phase 3 — Finisher Swarm Integration

### Step 3.1: Create finisher dispatch from dashboard

**Context brief:** Once projects have verified repository reports (completion %, tech stack, etc.), the dashboard must enable dispatching the Team Floyd Orchestrator to finish them to Beta Release. The orchestrator prompt at `/Users/douglastalley/AGENTS/agents/Team Floyd Orchestrator (Code-Only SSOT + Deterministic Worker Swarm).md` becomes the finisher.

**What this step does:**
1. Add "Dispatch Finisher" button to each project card in dashboard.html
2. Clicking it pre-fills the orchestrator Intake fields from the repository report data
3. Generates a copy-pasteable orchestrator invocation with project context pre-loaded
4. Tracks which projects have active finisher swarms

**Target file:** Update `dashboard.html` (add finisher dispatch UI)
**Depends on:** Phase 1, Phase 2 verified
**Verification:** Click "Dispatch Finisher" on a governed project → produces valid orchestrator intake prompt

### Step 3.2: Create finisher progress feedback loop

**Context brief:** When a finisher swarm is working on a project, the dashboard must reflect progress. The finisher's SSOT files (00-README.md through 06-Test-Plan.md) become the source of progress data.

**What the refresh script must additionally do:**
1. Check for `SSOT/05-Release-Readiness.md` → extract gate statuses
2. Map orchestrator gates to dashboard progress fields
3. Show "Active Swarm: YES" with last heartbeat timestamp

**Target file:** Update `scripts/refresh-registry.sh`
**Depends on:** Step 3.1
**Verification:** Dashboard shows gate statuses for projects with active finisher swarms

### Phase 3 Gate

| Gate | Requirement |
|---|---|
| Finisher dispatch works from dashboard | Button → valid orchestrator prompt generated |
| Progress feedback visible | Project with active finisher shows gate statuses |
| At least one project reaches BETA-READY | Dashboard shows BETA-READY badge |

---

## Dependency Graph

```
Phase 0 (Contracts)
├── 0.1 GOVERNANCE-ENTRY.md ─────┐
├── 0.2 agent-contract.md update ─┤──→ Phase 0 Gate
└── 0.3 REPOSITORY-REPORT-SPEC.md ┘
                                      │
Phase 1 (Dashboard)                   │
├── 1.2 refresh-registry.sh ←────────┘
└── 1.1 dashboard.html ←── 1.2
         │
Phase 2 (Bootstrap Fleet)            │
├── 2.1 bootstrap-worker.md ←───────┤
└── 2.2 dispatch-protocol.md ←──────┤
         │                           │
Phase 3 (Finisher Swarm)             │
├── 3.1 finisher dispatch UI ←──────┘
└── 3.2 progress feedback loop
```

**Parallel opportunities:**
- Steps 0.1, 0.3 can be drafted simultaneously (independent contracts)
- Steps 1.1 (HTML) and 1.2 (script) have some overlap but can be drafted in parallel with good interface spec
- Steps 2.1 and 2.2 depend on Phase 0 but not on Phase 1

---

## Anti-Pattern Catalog

| Anti-pattern | Why it's dangerous | Prevention |
|---|---|---|
| **Building dashboard before contracts** | Agents enter directories with no guidance → inconsistent bootstraps | Phase 0 MUST complete first |
| **Skipping the critic-check rounds** | Inaccurate completion % → wrong team size → wasted agent resources | REPOSITORY-REPORT-SPEC.md mandates 3 rounds minimum |
| **Hardcoding project data in HTML** | Dashboard goes stale immediately | Data in separate JSON, generated by refresh script |
| **Agent modifies source code during bootstrap** | Bootstrap is assessment, not implementation | GOVERNANCE-ENTRY.md explicitly forbids source changes |
| **Dashboard dispatch without verified report** | Finisher swarm works from bad data → wrong architecture decisions | Finisher button disabled until report verified |
| **One agent bootstraps all 47 projects** | Context overload, inconsistent quality | Dispatch protocol enforces fresh agent per project |

---

## Plan Mutation Protocol

This plan follows the blueprint mutation protocol:
- **Split a step**: If any step is too large for one session, split it into sub-steps and append `-a`, `-b`, etc.
- **Insert a step**: If a missing dependency is discovered, insert it with the next available decimal (e.g., Step 0.4)
- **Skip a step**: If a step is blocked by external dependency, mark it SKIPPED with blocker description
- **Abandon a step**: If requirements change, mark ABANDONED with rationale — never delete
- **All mutations append** to the Change Log below — never edit existing step descriptions

---

## Change Log (append-only)

- 2026-04-29T11:30:00-0400 — Plan created with 4 phases, 9 steps, anti-pattern catalog, and dependency graph.

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
