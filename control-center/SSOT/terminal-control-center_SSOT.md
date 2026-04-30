# terminal-control-center SSOT (Single Source of Truth)

## Authority
This document is the single source of truth for architecture and programmatic change facts.
All other documents must be treated as potentially flawed unless confirmed here.

## Verification sweep protocol (required)
When reading this SSOT:
1) Perform a line-by-line verification review of the sections relevant to the current task.
2) For each verified fact, append a verification entry with:
    - Timestamp
    - Section/line reference
    - Evidence source (code path, command output, build logs, runtime behavior)
    - Confidence = 100%
3) If any fact cannot be verified to 100% confidence:
    - Mark it **UNVERIFIED**
    - Add an Issue in Issues/terminal-control-center_ci_cd_ISSUES.md
    - Do not proceed as if the fact is true

## Positive reinforcement (required)
For each fact verified at 100% confidence, output:
- "Verified as fact (100%): <fact summary>"

## Architecture facts

- **Purpose:** Web-based multi-terminal manager for running, monitoring, and controlling multiple agent processes from a single browser tab, with an LLM-first API layer.
- **Tech stack:** Python 3.14 / FastAPI / uvicorn / Pydantic / vanilla JS / xterm.js / WebSocket PTY
- **Port:** 9527 (set via PORT env var in launchd plist; server default fallback is 9528)
- **Service management:** launchd plist at ~/Library/LaunchAgents/com.legacyai.tcc.plist
- **Launchd constraint:** macOS Tahoe rejects external volume paths for WorkingDirectory/StandardOutPath/StandardErrorPath — must use local paths (/tmp/) and bash wrapper with volume-wait loop.
- **LLM API:** Single endpoint POST /api/llm/do with 7 actions (list, read, run, stop, start, cancel, answer). Progressive disclosure via optional fields (wait_until, timeout, lines, include_advanced).
- **State detection:** output_analyzer.py provides heuristic terminal state classification (ready, busy, waiting_for_input, error, stopped) and hint generation.
- **Scrollback:** 64KB ring buffer per process, ANSI-stripped for LLM consumption.
- **Auto-restart:** Processes with auto_start=true restart up to 3 times in a 5-minute window.
- **Human UI:** index.html with xterm.js, grid/tab layouts, command palette, drag-and-drop. Served at GET /.
- **OpenAPI:** Auto-generated spec at /openapi.json includes all endpoints including /api/llm/do.

## Key files

| File | Purpose | Lines |
|---|---|---|
| server.py | FastAPI backend, PTY management, WebSocket terminals, launchd integration | ~1570 |
| llm_api.py | LLM-first API router — single endpoint, action dispatch, progressive disclosure | ~480 |
| output_analyzer.py | Terminal state detection heuristics, ANSI stripping, hint/tip generation | ~140 |
| index.html | Zero-build frontend, xterm.js grid/tab layouts | — |
| agents.json | Persisted agent configurations | — |
| Makefile | venv, run, dev targets | — |

## Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| fastapi | >=0.100.0 | Web framework |
| uvicorn | >=0.23.0 | ASGI server |
| pydantic | >=2.0.0 | Request/response validation |
| requests | (test only) | LLM benchmark script |

## Deployment

| Environment | Location | Status |
|---|---|---|
| Local (launchd) | ~/Library/LaunchAgents/com.legacyai.tcc.plist | Active, KeepAlive |
| Port | 9527 | Listening |
| Logs | /tmp/tcc-stdout.log, /tmp/tcc-stderr.log | Active |

## Change log (append-only)
- 2026-04-11 02:30 EDT — Initialized SSOT per governance protocol.
- 2026-04-11 02:30 EDT — Documented architecture facts from current session work (LLM API layer, launchd fix, state detection).
- 2026-04-11 02:45 EDT — Appended mandatory execution contract per governance directive.

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
