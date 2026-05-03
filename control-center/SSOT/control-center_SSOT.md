# Dashboard SSOT (Single Source of Truth)

**Created:** 2026-05-01T01:16:09-0400
**Last Updated:** 2026-05-03T00:51:15-0400
**Governance:** .supercache/ v1.6.2
**Project path:** `/Volumes/Storage/Legacy Agents/control-center/`
**Product name:** Dashboard
**Implementation directory:** `control-center/`

---

## Authority

This document is the **single source of truth** for the Dashboard application's architecture, product identity, integration model, beta-release requirements, and remaining work.

If any roadmap, plan, README, inherited Terminal Control Center document, MWIDE port note, iframe note, launcher note, or module-specific document conflicts with this SSOT, this SSOT wins. Conflicting documents are quarantine candidates under `.supercache/contracts/repo-sanitation.md`.

The original source applications remain standalone products. Dashboard receives copied source code from those applications and turns those copies into Dashboard-owned internal capabilities.

---

## Verification Sweep Protocol

When reading this SSOT for work:

1. Verify relevant facts against files, commands, or runtime behavior before relying on them.
2. Append each verified fact to the Verification Log with timestamp, section, evidence, and confidence.
3. If a fact cannot be verified to 100%, mark it `UNVERIFIED` and add an entry to `control-center/Issues/control-center_ISSUES.md`.
4. Do not proceed from unverified assumptions.

Positive reinforcement phrase for current-session verified facts:

```text
Verified as fact (100%): <fact summary>
```

---

## Current State

**Phase:** Active construction toward beta release
**Status:** Not beta-ready
**Last Agent Session:** 2026-05-03T00:51:15-0400
**Runtime posture:** single-user localhost during beta construction
**Primary app port:** 10527
**SSOT status:** canonical as of this update

Dashboard currently exists as a FastAPI + vanilla JavaScript application under `control-center/`. Several inherited or interim documents still describe the project as Terminal Control Center, ControlBoard, MWIDE embed, or launcher-based integration. Those descriptions are superseded by this SSOT.

---

## Product Identity

Dashboard is one new monoapplication, not a shell around older apps.

Dashboard owns:

- product name
- routes
- ports
- UI labels
- navigation
- state model
- persistence
- tests
- documentation
- release commit

The implementation directory is currently named `control-center/` for historical continuity, but the product identity is **Dashboard**. Future user-facing surfaces should use Dashboard-native capability names, not source-application names.

---

## Source-App Copy Rule

Existing applications are reusable source packages/modules. They are not final runtime dependencies and they are not co-branded sub-apps inside Dashboard.

For each source application:

1. Copy the actual source application code into the Dashboard monorepo.
2. Preserve enough copied structure to keep behavior intact before adaptation.
3. Record source path, copied revision/date, and copied scope in a source manifest.
4. Adapt the copied code inside Dashboard-owned directories.
5. Rename user-facing capability labels into Dashboard terminology.
6. Assign Dashboard-owned routes, APIs, state, persistence, and port strategy.
7. Verify the Dashboard copy works without the original app process running.
8. Verify the original source application still runs independently and has no unintended diff.

“Copy” means copy/paste actual code into Dashboard first. It does **not** mean inspiration-based rewrite.

---

## Non-Replacement Rule

Dashboard integration must not replace, retire, mutate, or take ownership of original applications.

Forbidden final states:

- iframe as completed integration
- launcher shortcut as completed integration
- read-only embed as completed integration
- runtime dependency on original app process
- mutating the original source repo to satisfy Dashboard
- preserving old app names/ports as Dashboard user-facing identity
- making the original app depend on Dashboard

Allowed temporary states during migration:

- iframe or launcher as a short-lived bootstrap bridge, explicitly labeled temporary
- adapter seam while copied source is being brought under Dashboard runtime
- internal source name in provenance manifests or historical notes

---

## Naming and Port Rules

User-facing names must describe Dashboard capabilities, not source apps.

| Source/internal provenance name | Dashboard-facing capability name |
|---|---|
| Terminal Control Center / TCC | Terminal Console |
| MWIDE / mobile-web-IDE | Workspace Editor |
| FLOYD CURSE'M | Agent Execution |
| Infrastructure Map | System Map |
| Governance Dashboard / ControlBoard | Project Control |
| System Health | System Health |

Port rules:

- Dashboard primary app port: 10527.
- Original app ports are not inherited as final Dashboard ports.
- Prefer internal API routes under the Dashboard app over public per-module ports.
- If a copied module temporarily needs a port, allocate a Dashboard-owned port and document it in the source manifest.
- Do not change original source-app ports unless a separate explicit task authorizes it.

---

## Architecture Facts

### Stack

- **Primary language:** Python + JavaScript.
- **Framework:** FastAPI backend, vanilla JavaScript frontend.
- **Runtime:** Python 3.14-era local runtime with uvicorn/FastAPI dependencies.
- **Frontend build:** zero-build `index.html` style inherited from the terminal source application.
- **Terminal transport:** WebSocket PTY, xterm.js.
- **Persistence:** JSON files and `.floyd/` runtime artifacts during construction.

### Current implemented surfaces

| Surface | Current status | Beta interpretation |
|---|---|---|
| Project Control | Partially implemented | Must be renamed and aligned to Dashboard identity; Bootstrap/Finisher dispatch still incomplete. |
| Terminal Console | Partially implemented | Existing terminal surfaces can be retained as Dashboard-owned capability after naming cleanup and beta tests. |
| Workspace | Partially implemented | Six-project workspace exists; deeper Workspace Editor copied module still missing. |
| Workspace Editor | Not beta-ready | Must copy actual MWIDE source into Dashboard and adapt the copy; current iframe/port plan is superseded. |
| Agent Execution | Not beta-ready | Launcher shortcut is not final integration; Dashboard needs a functional owned execution/run surface. |
| System Health | Partially implemented | Existing native scan surface can remain; needs beta verification and naming consistency. |
| System Map | Partially implemented | Existing vendored static map can remain if presented as Dashboard System Map and tested as native capability. |

---

## Key Decisions

| Date | Decision | Rationale | Decided By |
|---|---|---|---|
| 2026-05-03T00:51:15-0400 | Dashboard is one monoapplication with its own identity. | User clarified the final app is not a shell, iframe host, or collection of old app names. | Douglas Talley |
| 2026-05-03T00:51:15-0400 | Source app integration starts with copying actual source code into Dashboard. | User clarified “copy” means paste the original application code into the Dashboard monorepo, not rewrite from inspiration. | Douglas Talley |
| 2026-05-03T00:51:15-0400 | Original applications remain standalone and untouched. | Source apps are reusable products/modules; Dashboard owns its copied implementation, not the original. | Douglas Talley |
| 2026-05-03T00:51:15-0400 | Iframes, adapters, and launchers are temporary migration bridges only. | They do not satisfy functional-copy integration or beta release standards. | Douglas Talley |
| 2026-05-03T00:51:15-0400 | Beta release should land as one coherent new-project/repo commit. | User explicitly wants Dashboard treated as one new application/repo, not multiple integration PRs. | Douglas Talley |

---

## Source Manifests Required Before Beta

Each copied source capability must have a Dashboard-owned manifest. Suggested location:

```text
control-center/modules/<dashboard-capability>/source-manifest.json
```

Required fields:

```json
{
  "capability": "workspace-editor",
  "source_name": "MWIDE",
  "source_path": "/Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE",
  "copied_at": "2026-05-03T00:51:15-0400",
  "source_revision": "git sha or filesystem snapshot note",
  "copied_scope": ["files", "assets", "tests"],
  "dashboard_runtime": {
    "route_prefix": "/workspace-editor",
    "api_prefix": "/api/workspace-editor",
    "public_port": 10527
  },
  "original_preservation_check": "command/output proving original source has no unintended diff"
}
```

---

## Remaining Work to Beta Release Standards

### Beta definition

Dashboard reaches beta when a local operator can start one app on Dashboard's port, use every intended capability from that app, and complete the primary operator journeys without starting original source applications or seeing old source-app identities as product modules.

### Beta gate table

| Gate | Required beta outcome | Current status | Remaining work | Verification required |
|---|---|---|---|---|
| G1 — Product identity | App presents as Dashboard with Dashboard-native capability names. | FAIL | Rename user-facing labels/docs away from source-app names and old ControlBoard/TCC framing. | Active-doc grep shows no old product names outside provenance/history; browser nav shows Dashboard-native labels. |
| G2 — One app runtime | One app starts on port 10527 and serves all beta capabilities. | PARTIAL | Keep primary runtime under Dashboard; remove final reliance on per-source-app public ports. | `make run` or equivalent starts app; API/browser smoke uses only Dashboard port for final flows. |
| G3 — Copied functional modules | Required source apps are copied into Dashboard and work as internal capabilities. | FAIL | Copy actual source code for Workspace Editor and Agent Execution into Dashboard-owned module paths; normalize Terminal Console/System Map if needed. | Original source processes stopped; Dashboard capability still works; source manifests present. |
| G4 — Original preservation | Original applications remain standalone and unmutated. | UNKNOWN | Run git/status or filesystem diff checks for each source app after copy/adaptation. | Current-session outputs proving no unintended diff in original source paths. |
| G5 — Project Control | Project scan, quarantine alert, Bootstrap dispatch, Finisher dispatch work. | PARTIAL | Finish Bootstrap dispatch, first bootstrap batch validation, Finisher dispatch, orchestrator state display. | Endpoint tests + browser smoke + real candidate pilot. |
| G6 — Primary operator journeys | Operator can scan projects, open terminal, edit workspace, execute agent job, inspect health/map, dispatch finishers. | UNKNOWN | Define and run end-to-end browser scenario covering all journeys. | Browser automation evidence: no console errors; each journey produces expected UI/API result. |
| G7 — Automated tests | Unit/integration tests cover all beta capabilities. | PARTIAL | Add tests for copied modules, dispatch flows, source manifests, naming rules, no-original-runtime dependency. | `pytest -v` exits 0; targeted tests for each capability pass. |
| G8 — Documentation authority | SSOT is canonical; conflicting docs quarantined or corrected. | PASS | Maintain minimal active docs and quarantine any new conflicting docs discovered during beta work. | Quarantine LEDGER + 17 WHY files exist; active-doc grep only finds historical/provenance references or SSOT supersession notes. |
| G9 — Release hygiene | No secrets, no forbidden build artifacts, no stale root cruft, one coherent commit. | UNKNOWN | Diff review, secret scan, quarantine ledger review, commit message discipline. | `git diff --check`, conflict/secret grep, git status, conventional commit. |

### Concrete beta work packets

| Packet | Work | Files / areas | Exit criteria |
|---|---|---|---|
| BETA-01 | Product taxonomy cleanup | `index.html`, README/FLOYD/SSOT, tests | UI and active docs use Dashboard-native labels. |
| BETA-02 | Module directory standard | `control-center/modules/`, manifests, loader config | Every copied capability has manifest and Dashboard-owned path. |
| BETA-03 | Terminal Console hardening | terminal backend/frontend copied from current code | Terminal works inside Dashboard; tests cover spawn/connect/cleanup. |
| BETA-04 | Workspace Editor source copy | copy actual MWIDE source into Dashboard module | Workspace Editor works without MWIDE process; original MWIDE untouched. |
| BETA-05 | Agent Execution source copy | copy actual execution app/source into Dashboard module | Dashboard executes/runs agent workflow without external launcher dependency. |
| BETA-06 | Project Control dispatch | Bootstrap + Finisher APIs/UI/state | Dispatch buttons operate with prompt/intake artifacts and visible state. |
| BETA-07 | System Health + System Map native polish | health/map pages and routes | Pages render as Dashboard capabilities; no stale embed naming. |
| BETA-08 | End-to-end beta journey | browser automation + API smoke | One test run proves primary operator flow across all capabilities. |
| BETA-09 | Release hygiene and one commit | git diff, secret scan, docs scan, commit | One coherent beta commit is created only after all gates pass. |

---

## Active Document Policy

Active documentation for Dashboard should be minimal and non-conflicting:

- `control-center/SSOT/control-center_SSOT.md` — authoritative project state and beta plan.
- `control-center/Issues/control-center_ISSUES.md` — active issues/blockers ledger.
- `control-center/FLOYD.md` — project-governance entrypoint, with facts matching this SSOT.
- `control-center/CLAUDE.md` — Claude-specific adapter only; no project facts that conflict with FLOYD/SSOT.
- `control-center/README.md` — short reader entrypoint pointing to this SSOT and current run commands.

Inherited source-app docs, old plans, iframe/launcher final-state docs, and port-migration notes are quarantine candidates if they are not rewritten to match this SSOT.

---

## Verification Log (append-only)

| Timestamp | Section / Line | Fact Verified | Evidence Source | Confidence |
|---|---|---|---|---|
| 2026-05-01T01:16:09-0400 | Authority | Document initialized as SSOT | bootstrap.sh --init created from template | 100% |
| 2026-05-03T00:51:15-0400 | Product Identity | Dashboard is one monoapplication; old app names/ports are not final product identity | User clarification in current session: “one application with unique ports... one commit for the new project/repo” | 100% |
| 2026-05-03T00:51:15-0400 | Source-App Copy Rule | Copy means paste actual original app code into Dashboard monorepo before adaptation | User clarification in current session: “make a copy, paste it into the new monorepo that is Dashboard” | 100% |
| 2026-05-03T00:51:15-0400 | Current implemented surfaces | Current `index.html` still exposes Governance, Terminals, Dual Terminal, Workspace, MWIDE, System Health, Infrastructure | `control-center/index.html` nav lines observed in current session: 863-870 | 100% |
| 2026-05-03T00:51:15-0400 | Current plan conflict | Existing roadmap/controlboard plan describes MWIDE iframe/port migration and FLOYD CURSE'M launcher final state, which conflicts with this SSOT | `plans/ROADMAP.md` grep output lines 132-142, 297-298; `plans/controlboard.md` grep output lines 513-529 | 100% |

---

## Change Log (append-only)

- 2026-05-01T01:16:09-0400 — Initialized SSOT.
- 2026-05-03T00:51:15-0400 — Replaced placeholder SSOT with canonical Dashboard product/integration plan. Supersedes old ControlBoard/TCC/MWIDE-iframe/launcher planning docs. Added beta-release gates and remaining work packets.

---

## Mandatory execution contract

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
E) Quarantine ledger summary when quarantine occurred

## Hard gate
If any requested item has no evidence row, final status MUST be INCOMPLETE.
