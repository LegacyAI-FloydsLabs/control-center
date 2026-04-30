# Legacy Agents — Master Roadmap

**Version:** 1.0 (initial vision capture)
**Created:** 2026-04-30
**Authoritative Owner:** Douglas Talley
**Status:** Adopted as the umbrella vision; supersedes `plans/governance-orchestration-blueprint.md` as canonical north-star (the blueprint becomes one tactical implementation plan that delivers part of this).

> **Reading order:** This document is the *what* and the *why*. The `governance-orchestration-blueprint.md` covers part of the *how*. Specific governance bumps (v1.6.0 and beyond) carry the contract changes that lock the rules in place.

---

## 1. The Vision in One Sentence

A single, evidence-driven **ControlBoard** that surfaces every project on Douglas's drives in real time, computes exactly how far each project sits from a defined Beta Release, lets Douglas work in the top candidates from one screen instead of eight terminal tabs, and dispatches the **Team Floyd Orchestrator** to drive any project deterministically from PRD-only to Beta-Ready and onward through a clear lifecycle promotion path.

---

## 2. Operating Principles

These are non-negotiable. They shape every contract, every agent, every UI affordance.

| Principle | Meaning |
|---|---|
| **Code is truth.** | Docs, PRDs, and SSOT files are claims until verified by code or reproducible runtime evidence. |
| **No deletions.** | Agents never `rm`. Items leave active use only via quarantine (`<project>/.floyd/quarantine/<YYYY-MM-DD>/<original-path>` + `WHY.md`). Only Douglas may empty quarantine. |
| **Determinism over vibes.** | Same phases, same gates, same output schemas every time. |
| **One worker per packet.** | Fresh worker context for each unit of work. No "continue from previous session" state. |
| **Every claim cites evidence.** | File path + line ref, or command + output. No "should" / "probably" / "I think." |
| **Small reversible steps.** | Every change packet includes a rollback plan. |
| **Orchestrator ≠ implementer.** | The orchestrator plans, specifies, verifies, and updates the SSOT. It does not edit code directly. |

---

## 3. The Daily Bootstrap Routine (A→B→C→D, mandatory at every session start)

Every Claude/agent session that lands in a project directory MUST execute this routine before any other work. The routine is enforced by the `governance-entry.md` contract (v1.6.0) and the new sanitation contract.

### A — Cleanup round
- Walk the project tree
- Move stale/duplicate/orphan items to `.floyd/quarantine/<today>/` with a `WHY.md` per item
- **Never delete.** Quarantine only.
- Append a one-line summary to `.floyd/agent_log.jsonl`

### B — Documentation organization sweep
- Verify canonical document homes per `document-management.md`:
  - `FLOYD.md` at root, version stamp matches `.floyd/.supercache_version`
  - `SSOT/` directory with `<PROJECT>_SSOT.md` (legacy form) **OR** the Orchestrator's 7-file canonical set (00-README through 06-Test-Plan)
  - `Issues/` directory with `<PROJECT>_ISSUES.md`
  - `.floyd/agent_log.jsonl` exists
- Quarantine any anti-cruft violations (TODO.md, NOTES.md, SCRATCH.md at root, etc.) per the sanitation contract
- Reconcile FLOYD.md governance header drift (e.g. ATerm at v1.4.0 vs canonical v1.6.0 → flag in Issues, do not auto-bump without Douglas's call)

### C — Repository organization sweep
- Verify `.gitignore` baseline per `repo-hygiene.md` for the language
- Check project root tidiness (≤20 loose files at root)
- Check for committed secrets, build artifacts, backup files
- Quarantine violations to `.floyd/quarantine/<today>/`

### D — Code review at 100% confidence
- Run language-appropriate static analysis (ruff/mypy/biome/oxlint/typecheck/etc.)
- Read entrypoints, identify primary user journey paths in code
- Verify build/run commands actually succeed (capture exit codes + outputs)
- **No claim of "code reviewed" without evidence ledger** — every assertion gets a file:line citation

### E — Update `repository_report.json` (the data product)
This is the output of the routine. Every field is derived from A-D evidence. Schema lives at `Legacy Agents/repository_report_template.md` (existing, will be expanded).

| Field | Evidence source |
|---|---|
| `project_name` | Directory name |
| `completion_percentage` | Computed by Beta-readiness gate count: `passed_gates / total_required_gates × 100` |
| `tech_stack` | Manifest files (`package.json`, `pyproject.toml`, `go.mod`, etc.) |
| `complexity_score` | File count + dependency count + architecture pattern detection (rubric in repository-report-spec.md) |
| `team_size_minimum` | Mapped from completion bucket per existing `legacy-team-architect.py` rubric |
| `go_to_market_timeline` | Gates remaining × estimated cycle duration |
| `business_model` | Read from FLOYD.md project-specific section |
| `technical_debt` | TODOs / FIXMEs in code + lint findings + test coverage gaps |
| `scalability_needs` | Architectural patterns + deployment target |
| `target_users` | Read from FLOYD.md project-specific section |
| `key_features` | Discovered from code (route handlers, exported functions, CLI entry points) |
| `risks` | Open critical Issues + failed Beta-readiness gates |
| `gate_statuses` | The 7 Beta-Ready gates (PASS/FAIL/UNKNOWN/WAIVED) — see Section 5 |
| `last_bootstrap` | Timestamp of routine completion |

The output writes to `<project>/SSOT/repository_report.json`. The ControlBoard reads all of these to render the live dashboard.

### F — Verify
- Three critic-check rounds per `repository-report-spec.md` — re-read every field, confirm evidence
- Sign the report: append to `.floyd/agent_log.jsonl` with timestamp + agent identity
- Done. The ControlBoard now sees a fresh, evidence-backed report for this project.

---

## 4. The ControlBoard (the cockpit)

A single web app, **light-themed** (deliberately not dark like the DeepSeek prototype), with multiple "pages" that share state. Built on a clone of `terminal-control-center` repurposed as the controller.

### Anchor paths
- Source clone: `/Volumes/Storage/Legacy Agents/control-center/` (rsync done)
- Port: **10527** (claimed via port-registry)
- Live upstream TCC at `/Volumes/SanDisk1Tb/terminal-control-center/` is **untouched** — it continues to manage Douglas's daily Floyd-CREATIVE/COMPLEX/SURGICAL/STABILITY agents at port 9527

### Page 1 — Governance Dashboard
*Replaces the DeepSeek `dashboard.html` prototype.*

- Summary header: total projects, governed count, ungoverned count, drift count, **average completion %**
- Per-project expandable cards sorted by completion % descending
- Status badges: GOVERNED (green), CANDIDATE (yellow), DRIFTED (orange), UNASSESSED (gray)
- **Click-to-expand** shows the full `repository_report.json` for that project
- `file://` links to: FLOYD.md, SSOT, repository_report.json, project root
- "Dispatch Bootstrap" and "Dispatch Finisher" buttons per project (see Section 6)
- "Export to Markdown" — generates a snapshot of the full board state
- Light theme, intentional whitespace, status semantics encoded in color **and** glyph (so colorblind-safe)

### Page 2 — Six-Project Workspace
*Replaces eight terminal tabs.*

- Pre-populated with the **6 highest-completion-percentage but not-yet-DONE projects** (rank computed from `repository_report.json` files)
- Each pane: a `xterm.js` terminal already cd'd into the project, with broadcast/restart controls
- Drag-and-drop reorder, individual restart buttons, scrollback search per pane
- Lets Douglas do hands-on work across the active project portfolio from one screen

### Page 3 — Large Terminal Surface (Dual)
*Pulls visual concept ONLY from `Floyd TTY Bridge for Chrome/extension/sidepanel.html` — not the extension's native-messaging stack.*

- Two large stacked terminals, full container height
- Quick-click toggle between dual / single / triple
- Used when Douglas needs more screen real estate to focus deep on one or two surfaces
- TCC's existing PTY + WebSocket plumbing handles the terminal — only the layout idea is borrowed from the sidepanel

### Page 4 — Mobile Web IDE Embed (MWIDE)
*Anchored at `/Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE`.*

- Embeds MWIDE in a tab/iframe of the ControlBoard
- Used when Douglas needs to work deeper inside a project's code surface
- Rules of engagement TBD (port, auth scope, file-system access boundary) — captured as a follow-up plan item

### Hot-Button Launcher — FLOYD CURSE'M
- Sticky button on the ControlBoard
- One-click launch of `/Applications/FLOYD CURSE'M.app` for big jobs that need its full capability
- ControlBoard does not embed CURSE'M; it just launches and hands off

---

## 5. The Beta Release Readiness Gates (canonical definition of "DONE")

These gates are the heart of the % completion calculation. They come straight from the Team Floyd Orchestrator prompt.

| # | Gate | Definition |
|---|---|---|
| 1 | Build/Run | Clean setup works from `SSOT/04-Runbook.md` — exact commands, captured outputs |
| 2 | Primary Journey | The 1-3 user journeys defined in Phase 0 Intake work end-to-end |
| 3 | Automated Tests | Unit + integration tests present and passing (language-appropriate scope) |
| 4 | E2E Tests | Present and passing for primary journeys |
| 5 | Multi-minute Human Simulation | ≥3 scenarios of ≥10 minutes each, with notes + outcomes |
| 6 | Security Hygiene | Secrets scan clean; auth boundaries sanity-checked |
| 7 | Demo | Demo script executed end-to-end; checkpoints + Q&A capture saved |

### Gate Status Values (only)
`PASS` · `FAIL` · `UNKNOWN` · `WAIVED` (with reason + Douglas's approval)

### BETA-READY Declaration Rule
A project is BETA-READY only when:
- **0 FAIL** in the critical gates (Build/Run, Primary Journey, E2E)
- **0 UNKNOWN** across all gates
- Any `WAIVED` items have explicit Douglas approval

### Completion Percentage
`completion_% = passed_gates / 7 × 100`, rounded to nearest integer.
This is the number that drives the ControlBoard sort order and the Page 2 six-project selection.

---

## 6. The Team Floyd Orchestrator (the engine)

Each project past Phase 0 of the blueprint can be driven by an instance of the **Team Floyd Orchestrator** — the deterministic, long-horizon coordinator whose full prompt is captured at the bottom of this document. Key contract:

- Code is truth; orchestrator never implements
- One worker packet per cycle; fresh worker context every time
- Every response includes: HEARTBEAT, SSOT STATUS, BETA READINESS DASHBOARD, NEXT TASK PACKET, WORKER PROMPT
- Workers come from a fixed roster:
  1. Code-Only Repo Cartographer
  2. User Journey Tracer (Code-Only)
  3. Build/Run Harness Engineer
  4. Refactor & Organization Steward
  5. Bug Triage & Fix Worker
  6. E2E Human Journey Test Engineer
  7. Release Readiness Assessor
  8. Demo Script Producer
  9. Git Steward & Secret Guardian

### Dispatch from ControlBoard
- "Dispatch Bootstrap" button (project rows where status = UNASSESSED or CANDIDATE) → spawns a TCC agent running the Bootstrap Worker prompt against that project directory
- "Dispatch Finisher" button (project rows where status = GOVERNED + report verified) → spawns a TCC agent running the Team Floyd Orchestrator with that project's `repository_report.json` pre-loaded as Phase 0 Intake

### Orchestrator full prompt
Captured verbatim in Appendix A of this document for reference. The prompt is the contract; the ControlBoard is the dispatcher; the workers are the executors; the SSOT is the receipt.

---

## 7. Project Lifecycle & Promotion Path

```
                       ┌───────────────────────────────────────┐
                       │  Drive of projects (mixed states)     │
                       │  /Volumes/SanDisk1Tb/, /Volumes/Storage/  │
                       └────────────────┬──────────────────────┘
                                        │
                            Bootstrap routine A→F
                                        │
                                        ▼
                       ┌───────────────────────────────────────┐
                       │  GOVERNED — has SSOT, repository_     │
                       │  report.json, .floyd stamp, baseline  │
                       │  hygiene                              │
                       └────────────────┬──────────────────────┘
                                        │
                       Team Floyd Orchestrator drives gates 1-7
                                        │
                                        ▼
                       ┌───────────────────────────────────────┐
                       │  BETA-READY (0 FAIL on critical, 0    │
                       │  UNKNOWN, all WAIVED approved)        │
                       └────────────────┬──────────────────────┘
                                        │
                              Import to staging
                                        ▼
                       ┌───────────────────────────────────────┐
                       │  /Volumes/Storage/Development/        │
                       │  dev-launcher                         │
                       │  (lives here until promotion decided) │
                       └─┬───────────────────┬─────────────────┘
                         │                   │              │
                         ▼                   ▼              ▼
              Open-Source AS-IS    Production Release   Enterprise Release
              (in-dev visibility,  (packaged + polished, (extra hardening,
               community pickup)    feature-complete)    SLA, compliance,
                                                         long-term support)
```

### Triggers for promotion
- **Open-source as-is**: Douglas judges the code base has community value even in current state
- **Production Release**: feature-complete, primary journeys polished, ready for paying users
- **Enterprise Release**: above plus SLA capacity, compliance scaffolding (HIPAA/SOC2/etc.), audit trails, long-term support commitments

### What stays gated
- Promotion only happens by Douglas's call. Agents do not auto-promote.
- Each promotion tier requires its own readiness gate set (to be defined in v1.7.0+ governance bump).

---

## 8. Quarantine & Sanitation (the v1.6.0 governance layer)

The bootstrap routine and the Orchestrator both depend on a guarantee that **no agent ever deletes anything**. This guarantee is locked in at the governance layer in v1.6.0.

### v1.6.0 governance bump scope (separate document; this is the inventory)
- **NEW:** `.supercache/contracts/repo-sanitation.md` — the no-delete + quarantine contract, with embedded execution contract for both doc management and repo sanitation
- **MODIFIED:** `contracts/document-management.md` — replace "Delete" lifecycle action with "Quarantine"; reference new contract; fix v1.4.1 → v1.6.0 drift
- **MODIFIED:** `contracts/repo-hygiene.md` — replace "Safety Protocol Before Deleting" with "Quarantine Protocol"; remove deletion-allowed exits
- **MODIFIED:** `contracts/agent-contract.md` — keep DeepSeek's refs to governance-entry.md + repository-report-spec.md; add reference to repo-sanitation.md
- **MODIFIED:** `contracts/governance-entry.md` (DeepSeek's, untracked) — add bootstrap routine A→F reference; tie to ControlBoard
- **MODIFIED:** `contracts/repository-report-spec.md` (DeepSeek's, untracked) — confirm field schema matches Section 3.E above
- **MODIFIED:** `templates/ssot-template.md` — add Quarantine Pointer section so future bootstraps inherit it
- **MODIFIED:** `VERSION`, `README.md`, `CHANGELOG.md` — standard bump artifacts

### Quarantine path convention
```
<project-root>/.floyd/quarantine/<YYYY-MM-DD>/<relative-original-path>
<project-root>/.floyd/quarantine/<YYYY-MM-DD>/<relative-original-path>.WHY.md
```

`WHY.md` per quarantined item: one-line reason, agent identity, timestamp, original-path. Only Douglas may empty quarantine.

---

## 9. Mapping the Existing Blueprint to This Roadmap

The `governance-orchestration-blueprint.md` (DeepSeek, 308 lines, dated 2026-04-29) covers Phase 0 governance contracts and a thin Phase 1 dashboard. Mapping:

| Blueprint phase/step | Maps to Roadmap section | Status |
|---|---|---|
| Phase 0.1 (`GOVERNANCE-ENTRY.md`) | §3 (Bootstrap routine) + §8 (v1.6.0) | Content drafted; awaiting v1.6.0 ratification + quarantine clause |
| Phase 0.2 (`agent-contract.md` update) | §8 (v1.6.0) | DeepSeek's edits stand; v1.6.0 adds repo-sanitation.md ref |
| Phase 0.3 (`REPOSITORY-REPORT-SPEC.md`) | §3.E (the schema) + §8 (v1.6.0) | Content drafted; awaiting v1.6.0 ratification |
| Phase 1.1 (dashboard.html) | §4 (ControlBoard Page 1) | **Superseded** by the TCC clone direction; DeepSeek's `dashboard.html` is to be quarantined |
| Phase 1.2 (refresh-registry.sh) | §4 (TCC's existing API endpoints replace this) | **Superseded**; DeepSeek's broken script to be quarantined |
| Phase 2.1 (bootstrap-worker.md) | §6 (Worker roster + dispatch) | Still valid; will be authored as part of Page 1's "Dispatch Bootstrap" wiring |
| Phase 2.2 (dispatch-protocol.md) | §6 (dispatch from ControlBoard) | Still valid; folds into Page 1 UI affordances |
| Phase 3.1 (finisher dispatch UI) | §6 ("Dispatch Finisher" button) | Still valid; lives in Page 1 |
| Phase 3.2 (finisher progress feedback loop) | §3.E (repository_report.json includes gate_statuses) + §4 Page 1 (real-time refresh) | Still valid; mechanism is the bootstrap routine running on each session, not a separate progress poller |

### Net new in this roadmap (beyond the blueprint)
- Bootstrap routine A→F as a *daily session-start* contract, not a one-time bootstrap
- The 4-page ControlBoard architecture (blueprint had only one page)
- The Page 2 "six highest-% projects" workspace concept
- The Page 3 large-terminal surface from sidepanel.html
- The Page 4 MWIDE embed
- The FLOYD CURSE'M hot-button launcher
- The lifecycle promotion path (dev-launcher → open-source / production / enterprise)
- The quarantine-instead-of-delete rule across all contracts (v1.6.0)
- Embedding the Team Floyd Orchestrator prompt as canonical engine-of-record

---

## 10. Implementation Sequence (high level)

| # | Milestone | Blocker satisfied by |
|---|---|---|
| 1 | v1.6.0 governance bump shipped | (now blocked on Douglas's morning additions + quarantine wording finalization + simulate→apply→verify) |
| 2 | TCC clone customized (Page 1 governance dashboard, light theme, project cards) | Milestone 1 |
| 3 | Bootstrap Worker prompt authored | Milestone 1 |
| 4 | Page 2 (6-project workspace) wired with auto-population from `repository_report.json` ranking | Milestone 2 |
| 5 | Page 3 (large terminal layout) added as a TCC layout option | Milestone 2 |
| 6 | "Dispatch Bootstrap" button operational | Milestones 2 + 3 |
| 7 | First batch of CANDIDATE projects bootstrapped end-to-end | Milestone 6 |
| 8 | Page 4 MWIDE embed | Milestone 2 + MWIDE port/auth scope decisions |
| 9 | FLOYD CURSE'M hot-button launcher | Milestone 2 |
| 10 | "Dispatch Finisher" button operational + Orchestrator integration | Milestones 2-7 + verified `repository_report.json` for at least one project |
| 11 | First project reaches BETA-READY | Milestone 10 |
| 12 | dev-launcher staging path activated; first promotion decision made | Milestone 11 |
| 13 | Promotion-tier gate definitions (v1.7.0 governance bump) | Milestone 12 |

---

## 11. What Each Stakeholder Does

| Actor | Allowed |
|---|---|
| **Douglas** | Defines goals, approves promotions, decides waivers, runs simulate/apply/verify on governance bumps, makes lifecycle calls (open-source / production / enterprise) |
| **ControlBoard** | Reads `repository_report.json` files, renders dashboard, dispatches workers via TCC API, displays live terminal sessions |
| **Bootstrap Worker** | Runs routine A→F on a single project; produces `repository_report.json`; quarantines violations; never deletes |
| **Team Floyd Orchestrator** | Drives a single project from current state to BETA-READY via deterministic worker packets; never implements |
| **Roster Workers** (1-9) | Execute exactly one packet from the orchestrator; produce evidence; emit SSOT patches |
| **Governance Layer** (`.supercache/`) | Read-only at runtime; updated only via the legacy-governance-assistant skill workflow + Douglas-run apply |

---

## 12. Resolved Open Questions (2026-04-30)

1. **Morning additions = the blueprint itself.** Douglas authored the `governance-orchestration-blueprint.md` yesterday morning (via DeepSeek as scribe). There are no separate edits I've been missing. The blueprint's Phase 0 contracts ARE the morning additions, and they need to be ratified through v1.6.0.
2. **Quarantine retention: manual-purge by Douglas only.** No TTL. **The ControlBoard MUST display a persistent alert / badge whenever quarantine items exist anywhere in the project portfolio**, surfacing the count and pointing at the affected projects. The alert remains visible until Douglas explicitly empties quarantine.
3. **MWIDE port: needs a fresh registry claim.** Current state — `mobile-web-IDE/server.ts:26` defaults to PORT 10001, which is already claimed by `legacy-ai-delivery-architecture-package-next-portal` in `/Volumes/SanDisk1Tb/SSOT/port-registry.json`. MWIDE's `FLOYD.md` still has unfilled `{{PORT}}` template placeholder. **Proposed claim: 10602** (free, in available range 10000–65535). Goes into a separate small port-registry update, not in v1.6.0 scope.
4. **Promotion-tier gate definitions: deferred.** Douglas will define open-source vs production vs enterprise criteria when a project actually approaches the dev-launcher staging path. Not in v1.6.0 scope; revisit at v1.7.0 when first project promotion is imminent.
5. **Page 2 ranking tiebreak: defaulted to "staler bootstrap loses."** When two projects have identical completion %, the one with the older `last_bootstrap` timestamp ranks lower (drops off the top 6). Adopt this default; revisit if it produces surprising behavior in practice.
6. **ControlBoard auth: defaulted to single-user localhost.** Matches upstream TCC's posture (`OPERATIONS.md:152-157` — "single-user, localhost-only by design, no authentication, do not bind to a public interface"). The clone inherits this. If Douglas later needs remote access, ssh-tunnel pattern (per the same TCC docs) — no auth surgery on the ControlBoard itself.

---

## Appendix A — Team Floyd Orchestrator Prompt (verbatim, canonical)

```
You are the Team Floyd Orchestrator — a deterministic, long-horizon coordinator
that drives a software project from any state (PRD-only to 90% complete) to
minimum Beta Release Readiness using a strict, repeatable process.

Your core stance:
- Code is truth. Docs are claims until verified by code and reproducible runtime evidence.
- Determinism over vibes. You follow the same phases, gates, and output schemas every time.
- Orchestrator ≠ implementer. You do not change code, configs, or files. You only plan,
  specify, verify, and update the SSOT text.
- One worker at a time. Exactly one worker packet per cycle. Fresh worker per packet.

---

## Hard Capability Reality (No Roleplay)
You cannot literally keep a timed heartbeat, run continuously, or autonomously spawn
tools/agents in the background.
So you must implement these requirements as deterministic output requirements:
- Heartbeat = a required section in every orchestrator response.
- Spawning a worker = emitting a copy/pasteable worker prompt that the user (or an
  automation) runs in a separate worker context.
- Fresh worker policy = every packet produces a brand-new worker prompt; never refer
  to "continue from prior worker context" unless the user supplies that context.

If the user environment does not support worker execution, you must stop and report
the blocker rather than pretending.

---

## Prime Directive
Deliver a beta-ready product that a human can use end-to-end for multi-minute real
workflows, backed by:
1) a code-evidenced SSOT,
2) a deterministic execution log (evidence ledger),
3) an E2E testing suite aligned to real human journeys,
4) a human demo script + Q&A capture + updated TODO backlog.

---

## Non-Negotiables
1) Code-only truth: never treat docs/specs/PRDs as authoritative.
2) No hidden implementation: if asked to "just fix it," you must produce a worker packet,
   not do the fix.
3) No data deletion: "remove old docs" means relocate + banner + de-index; deletion
   requires explicit approval.
4) Every claim must cite evidence: file paths + line refs and/or exact command + output.
5) Small, reversible steps: all change packets must include rollback steps.
6) No parallel execution: one worker packet at a time.

---

## Phase 0 — Intake & Guardrails (Mandatory First Output)
Before any audit plan, you must produce an Intake section and, if missing, ask the user
only the minimum questions required to proceed deterministically.

### Required Intake Fields
- Repo location / access method (local path, URL, or attached files)
- Target runtime + language + package manager
- Execution environment constraints (OS, Node/Python/Java versions, Docker availability)
- Permission boundaries (audit-only vs allowed to modify)
- Deployment target (local-only beta vs hosted)
- Beta definition: top 1–3 primary user journeys that must work end-to-end

If any required field is unknown and blocks deterministic execution, you must ask for
it immediately.

---

## SSOT Policy (Single Source of Truth)
### Definition
The SSOT is authoritative documentation only when every statement is backed by code
evidence or reproducible runtime evidence.

### SSOT Location + Canonical File Set
Default to creating/updating these in-repo paths (or instructing a worker to do so):
- SSOT/00-README.md (what SSOT is, evidence rules)
- SSOT/01-Product-Truth.md
- SSOT/02-User-Journeys.md
- SSOT/03-Architecture.md
- SSOT/04-Runbook.md (build/run/test commands that were proven)
- SSOT/05-Release-Readiness.md
- SSOT/06-Test-Plan.md

### SSOT Update Protocol (Deterministic)
Every ACCEPTED worker packet must include:
- SSOT Patch Proposal: exact text blocks to add/replace, with target SSOT filename
  and heading anchor.
- Evidence Links: file paths/lines and command outputs that justify each SSOT change.

The orchestrator must then:
- mark the SSOT section(s) as Updated / Still Unknown
- carry forward any Unknowns into the next packet

---

## Legacy Docs Handling Policy (Deterministic)
"Remove old docs" means:
1) relocate to docs/_legacy/ (or /_archive/docs/),
2) add a top-of-file banner: LEGACY — NOT SSOT — CLAIMS UNVERIFIED,
3) remove/replace references from README/onboarding docs to point to SSOT.

Deletion is forbidden unless the user explicitly approves deletion of specific files.

---

## Beta Release Readiness Gates (Minimum)
You may only declare BETA-READY when:
- Build/Run: clean setup works from SSOT Runbook
- Primary journey: end-to-end works for the defined journeys
- Automated tests: present and passing (unit/integration as appropriate)
- E2E tests: present and passing for primary journeys
- Multi-minute human simulation: at least 3 scenarios of ≥10 minutes each (or
  project-appropriate), with notes and outcomes
- Security hygiene: secrets scan performed; auth boundaries sanity-checked
- Demo: demo script executed with checkpoints + Q&A capture

### Gate Status Values
Only these values are allowed: PASS, FAIL, UNKNOWN, WAIVED (reason + approver).

### Beta Declaration Rule
BETA-READY requires:
- 0 FAIL in critical gates (Build/Run, Primary Journey, E2E)
- 0 UNKNOWN across all gates
- any WAIVED items must be explicitly approved by the user

---

## Deterministic Worker Roster (Baseline)
Workers are short-lived specialists. The orchestrator chooses exactly one per packet.

1) Code-Only Repo Cartographer (structure + entrypoints)
2) User Journey Tracer (Code-Only) (journeys + branches + state/data)
3) Build/Run Harness Engineer (reproducible commands)
4) Refactor & Organization Steward (safe moves, config hygiene)
5) Bug Triage & Fix Worker (P0 blockers)
6) E2E Human Journey Test Engineer (realistic E2E suites)
7) Release Readiness Assessor (gates, performance/stability basics)
8) Demo Script Producer (demo flow + Q&A capture)
9) Git Steward & Secret Guardian (pre-commit/push audit)

You may add repo-specific roles only after Phase 1 mapping.

---

## Worker Packet Rules (One-at-a-time)
Each orchestrator cycle creates exactly one Task Packet and exactly one Worker Prompt.

### Task Packet Schema (must be emitted verbatim)
- Packet ID: TF-###
- Objective: one sentence
- Inputs Provided: paths/URLs/context
- Assumptions: explicit list (empty if none)
- Steps (Deterministic): numbered, command-level when possible
- Deliverables: exact artifacts + where they live
- Verification: exact commands + expected outcomes
- Rollback Plan: explicit steps
- SSOT Patch Targets: which SSOT files/sections are expected to change

### Worker Prompt Template (copy/pasteable)
The orchestrator must output the worker prompt using this template:

WORKER ROLE: [one roster role]
SCOPE: [what to change / not change]
ALLOWED ACTIONS: [read/grep/glob/bash/edit]
FORBIDDEN ACTIONS: [no deletions, no behavior change unless approved, etc.]
TASK PACKET: [paste the Task Packet]
DELIVERABLES: [repeat deliverables]
EVIDENCE REQUIREMENTS: [file/line + command/output]
VERIFICATION RECEIPTS REQUIRED: [yes/no + exact commands]

Then append the Execution Contract verbatim.

---

## Orchestrator Allowed Actions (Enforced)
You may only:
1) Produce the next Task Packet + Worker Prompt
2) Evaluate worker evidence vs contract
3) Update the SSOT status (Updated/Unknown) and backlog items
4) Decide ACCEPT / FIX REQUEST / ROLLBACK

You may not:
- implement code changes directly
- claim completion without evidence receipts
- skip a failing verification

---

## Stop / Escalation Conditions
Stop and report a blocker if:
- repo cannot be accessed
- required intake fields are missing and user won't provide them
- verification cannot be executed or reproduced
- a change would require deletion or risky behavior change without approval

---

## Orchestrator Response Format (Every Response)
1) HEARTBEAT
    - Phase
    - Packet in progress
    - Last verified outcome
    - Current blockers
2) SSOT STATUS
    - Files present/missing
    - Unknowns list
3) BETA READINESS DASHBOARD
    - Gates with PASS/FAIL/UNKNOWN/WAIVED
4) NEXT TASK PACKET (single)
5) WORKER TO RUN (single)
    - Worker Prompt (copy/pasteable)

---

<execution-contract>
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
</execution-contract>
```

---

## Change Log

- 2026-04-30 — ROADMAP.md created, captures the full vision Douglas articulated. Supersedes the blueprint as umbrella plan; blueprint becomes one tactical implementation plan that delivers parts of this roadmap. Locks in the 4-page ControlBoard architecture, daily bootstrap routine A→F, lifecycle promotion path, quarantine-only sanitation rule, and the canonical Team Floyd Orchestrator prompt as Appendix A.
- 2026-04-30 — All six §12 questions resolved. Morning additions = the blueprint. Quarantine = manual purge only with persistent ControlBoard alert. MWIDE port claim pending (proposed 10602; default 10001 collides). Promotion tiers deferred to v1.7.0. Page 2 tiebreak defaulted to staler-loses. ControlBoard auth = single-user localhost (matches TCC).
