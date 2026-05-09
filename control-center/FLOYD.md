# Floyd's Unified Command Kernel — FLOYD.md

**Version:** 1.1.0
**Initialized:** 2026-04-30
**Governance:** .supercache/ v1.6.2
**Canonical SSOT:** `SSOT/control-center_SSOT.md`
**Port:** 10527
**Path:** `/Volumes/Storage/Legacy Agents/control-center/`

---

## Agent Contract

You are working on **Floyd's Unified Command Kernel**, a Legacy AI monoapplication.

`FLOYD.md` is the project-governance entrypoint. The authoritative product architecture, integration rule, beta gates, remaining work, verification log, and supersession policy live in `SSOT/control-center_SSOT.md`.

If this file conflicts with `SSOT/control-center_SSOT.md` on product facts, the SSOT wins and this file must be corrected.

---

## Before You Start

1. Read this file completely.
2. Read `SSOT/control-center_SSOT.md` for the current Kernel architecture and beta-release work.
3. Read `Issues/control-center_ISSUES.md` for active blockers and sanitation records.
4. Read `/Volumes/SanDisk1Tb/.supercache/READONLY` — never write to `.supercache/`.
5. Read `/Volumes/SanDisk1Tb/.supercache/contracts/execution-contract.md`.
6. Read `/Volumes/SanDisk1Tb/.supercache/contracts/document-management.md`.
7. Read `/Volumes/SanDisk1Tb/.supercache/contracts/repo-sanitation.md`.
8. Read `/Volumes/SanDisk1Tb/.supercache/contracts/git-discipline.md` before commits.

---

## Project Identity

| Field            | Value                                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name             | Floyd's Unified Command Kernel                                                                                                                                                |
| Purpose          | One Legacy AI monoapplication that copies reusable source-app code into Kernel-owned internal capabilities and drives projects toward beta readiness. |
| Primary Language | Python + JavaScript                                                                                                                                      |
| Framework        | FastAPI backend; zero-build vanilla JavaScript frontend                                                                                                  |
| Runtime          | Python local runtime / uvicorn during development                                                                                                        |
| Port             | 10527                                                                                                                                                    |
| Current Phase    | Active construction toward beta                                                                                                                          |

---

## Product Rules

| #   | Rule                                                                                                            | Rationale                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| D1  | The Kernel is one product, not a shell around old apps.                                                          | The beta target is one coherent monoapplication.                                                           |
| D2  | Copy actual source-app code into the Kernel before adapting it.                                                  | The user builds modular apps for reuse; integration means pasted functional copy, not inspiration rewrite. |
| D3  | Do not mutate original source applications to make the Kernel work.                                              | Originals remain standalone products/modules.                                                              |
| D4  | Do not treat iframe, adapter, or launcher as final integration.                                                 | Those are temporary migration bridges unless explicitly reclassified.                                      |
| D5  | Use Kernel-native user-facing names/routes/ports.                                                            | Old app identities are provenance, not final product UI.                                                   |
| D6  | Quarantine superseded docs; never delete.                                                                       | Governance v1.6.x requires quarantine with WHY.md and LEDGER.jsonl.                                        |
| D7  | Beta completion requires observable app behavior, tests, and no-original-runtime dependency for copied modules. | Compiling or serving HTML is not enough.                                                                   |

---

## Key Files

| File                              | Purpose                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `SSOT/control-center_SSOT.md`     | Canonical Kernel plan, architecture, beta gates, remaining work               |
| `Issues/control-center_ISSUES.md` | Kernel issue and sanitation ledger                                            |
| `README.md`                       | Short entrypoint pointing readers to the SSOT                                    |
| `server.py`                       | FastAPI backend and runtime API surface                                          |
| `index.html`                      | Current zero-build frontend shell; must be normalized to Kernel-native labels |
| `scripts/`                        | Kernel-owned automation and scanning tools                                    |
| `tests/`                          | Kernel test suite                                                             |

---

## Build & Verify Commands

Run from `control-center/`:

| Action      | Command                         | Expected Result                          |
| ----------- | ------------------------------- | ---------------------------------------- |
| Create venv | `make venv`                     | Exit 0; `.venv/` exists                  |
| Start app   | `make run`                      | App listens on `http://localhost:10527/` |
| Tests       | `.venv/bin/python -m pytest -v` | Exit 0; tests pass                       |

---

## Source-App Boundary

Original source applications are read/write only in their own explicit tasks. Kernel integration work must copy code into Kernel-owned paths, then adapt the copy.

Source names may appear in provenance manifests, quarantine WHY files, and historical notes. They should not appear as final Kernel product module names.

---

## Where You Write

| Location     | Purpose                                            |
| ------------ | -------------------------------------------------- |
| `SSOT/`      | Project truth, beta gates, verification log        |
| `Issues/`    | Issues, blockers, sanitation ledger                |
| `.floyd/`    | Agent working state, quarantine, runtime artifacts |
| Source files | Kernel implementation                           |

Never write to `/Volumes/SanDisk1Tb/.supercache/`.

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
