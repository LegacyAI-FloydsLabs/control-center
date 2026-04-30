# control-center — Legacy Agents ControlBoard FLOYD.md
**Version:** 1.0.0
**Initialized:** 2026-04-30
**Governance:** .supercache/ v1.6.0
**Forked from:** `/Volumes/SanDisk1Tb/terminal-control-center/` (rsync 2026-04-28; upstream remains untouched at port 9527)

---

## Agent Contract

You are working on **terminal-control-center**, a Legacy AI project.

### Before You Start
1. Read this file completely.
2. Read `.supercache/READONLY` — you MUST NOT write to .supercache/.
3. Check `SSOT/README.md` for current project state.
4. Check `Issues/README.md` for open issues.

### Governance Location
```
.supercache/ → /Volumes/SanDisk1Tb/.supercache
```

This directory contains global templates, contracts, manifests, and routing config. It is **READ-ONLY**. Do not create, modify, or delete any file there.

### Where You Write
- `SSOT/` — project status, decisions, findings
- `Issues/` — bugs, blockers, tasks
- `.floyd/` — agent working state, session logs, runtime cache
- Project source files — your actual work

### Execution Contract
Before claiming any task complete, provide:
1. Exact action taken
2. Direct evidence (file/line/command/output)
3. Verification result
4. Status only after proof

See `.supercache/contracts/execution-contract.md` for full details.

### Model Routing
See `.supercache/manifests/model-routing.yaml` for which LLM to use for which task type.

### Available Services
See `.supercache/manifests/resource-manifest.yaml` for all available infrastructure.

---

## Project-Specific Context

<!-- Add project-specific information below this line -->
<!-- This section is the ONLY part of FLOYD.md that should be customized per project -->

**Purpose:** Legacy AI ControlBoard — 4-page operational dashboard surfacing every governed project on Douglas's drives, the daily bootstrap routine A→F, the 7 Beta-Readiness gates, the 6-project workspace, the large terminal surface, the MWIDE embed, and the Team Floyd Orchestrator dispatch points. Construction tracked at `/Volumes/Storage/Legacy Agents/plans/controlboard.md`. Vision at `/Volumes/Storage/Legacy Agents/plans/ROADMAP.md`.

**Tech Stack:** Python 3.14 / FastAPI / uvicorn / Pydantic / vanilla JS / xterm.js / WebSocket PTY (inherited from upstream TCC)

**Key Files:**
- `server.py` — FastAPI backend, PTY management, launchd integration, WebSocket terminals; this fork extends with `/api/projects`, `/api/quarantine-summary`, `/api/dispatch/bootstrap`, `/api/dispatch/finisher`, `/api/launch-cursem`
- `index.html` — Zero-build frontend, xterm.js grid/tab layouts, command palette, drag-and-drop; this fork adds Governance / Workspace / Large Terminal / MWIDE views
- `agents.json` — Persisted agent configurations (reset to `{}` for ControlBoard fresh start; upstream's CREATIVE/COMPLEX/SURGICAL/STABILITY agents stay on upstream TCC)
- `Makefile` — venv, run, dev targets (inherited)
- `docs/bootstrap-worker.md` — Bootstrap Worker prompt (Step 7 of controlboard plan)
- `docs/finisher-orchestrator.md` — Team Floyd Orchestrator prompt (Step 11 of controlboard plan)

**Port:** 10527 (to be claimed in `/Volumes/SanDisk1Tb/SSOT/port-registry.json`; upstream TCC at 9527 untouched)

**Current Phase:** In construction (controlboard plan — Step 1 in progress 2026-04-30)

**Theme default:** light (the failed DeepSeek prototype was dark; the redesign is intentionally light)

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
