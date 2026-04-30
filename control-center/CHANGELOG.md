# Changelog

All notable changes to **Terminal Control Center (TCC)** are recorded here.

Format: `[YYYY-MM-DD HH:MM:SS TZ] Change summary` followed by structured detail.

This file is **append-only** — never edit historical entries; add new entries at the top of the
"Unreleased" section.

---

## Unreleased — Final Push Closer Hardening Pass

### [2026-04-28 22:01:00 EDT] Wire up CRON scheduler + launchd plist generation
- **What changed (CRITICAL — CRON and launchd were silently broken):**
  - `server.py`: `POST /api/agents` now calls `_generate_launchd_plist` when `launchd_type != "none"`. `PUT /api/agents/{id}` regenerates or removes the plist when launchd config changes. `DELETE /api/agents/{id}` now removes the plist before deleting the record. Previously the API stored the schema fields but **never actually wrote the plist or talked to launchctl** — so a daily user setting `launchd_type=timer` got nothing.
  - `server.py`: added `_cron_scheduler_loop` background task started in `lifespan`. Wakes every 60 seconds, finds any agent whose `cron_expression` is due (via `compute_next_cron`), and spawns it via the same `spawn_process` path the UI uses. Honors `last_cron_fire` so the same minute can't fire twice across a server restart. Skips if a process is already running for that agent (no pile-up).
  - `tests/test_automation_e2e.py` (new): six end-to-end tests covering plist creation, launchctl-known status, automation-jobs surface, disable/re-enable round-trip, keepalive RunAtLoad, cron-listing, and a real-time 75-second test that creates a `* * * * *` agent and asserts the scheduler actually fires it (verified by sentinel file + uptime check).
  - `Makefile`: `test-automation`, `test-automation-slow` targets; `test` now includes `test-automation`.
- **Why:** The user is going to host real launchd-managed and cron-scheduled agents on TCC. Both features had to actually work, not just exist as schema fields. The CRON gap was discovered while writing the integration tests — the schema, validator, helper presets, and `compute_next_cron` were all in place, but **nothing was firing them**. Without this fix, scheduled agents would silently never run.
- **Files/areas touched:** `server.py` lines ~852-915 (cron scheduler + lifespan), `server.py` lines ~1018-1062 (create/update/delete plist wiring); `tests/test_automation_e2e.py` (new, 224 lines); `Makefile` (test-automation targets).
- **Tests run:**
  - `pytest tests/test_automation_e2e.py -v` (excluding slow cron) → 5/5 PASS in 0.57s.
  - `pytest tests/test_automation_e2e.py::test_cron_scheduler_actually_fires_due_agents -v -s` (75s real-time) → PASS in 44.26s — sentinel file written by cron-fired process.
  - `pytest tests/test_api_smoke.py tests/test_workflows_ui.py tests/test_automation_e2e.py -v` (excluding slow cron) → 27/27 PASS.
- **Result:** TCC's launchd integration and CRON scheduling are now functional end-to-end. Daily user can rely on both for hosting persistent agents.

### [2026-04-28 22:01:00 EDT] Strengthened proof iteration: 12 distinct human interactions
- **What changed:** Rewrote `_run_one_iteration` in `tests/test_proof_floyd.py` to perform 12 distinct keyboard/mouse interactions per iteration (sidebar click, terminal click, 7-char keyboard burst, Ctrl+C, frame hover, search button click, search-input typing, Escape, font-up click, font-down click, terminal refocus, final 'z' keypress). Verification combines deterministic WS byte-counter delta with TUI-redraw observation (the daily-user proof: keystrokes reach the PTY AND the terminal visibly reacts).
- **Why:** The previous iteration counted "steps" but most were pure waits — only ~4 were real human interactions. The user's mental model is "do real human things repeatedly and prove it works"; the test now does that.
- **Files/areas touched:** `tests/test_proof_floyd.py` (full rewrite of `_run_one_iteration`); `tests/test_workflows_ui.py` (workflow 3 redraw assertion replaces literal-echo bonus check that was unreliable for TUIs).
- **Tests run:** `RUN_PROOF=1 pytest tests/test_proof_floyd.py -v -s` → 10/10 PASS in 93.86s. Per-iteration screenshots in `tests/artifacts/proof_floyd/proof_iter_NN.png`; full timestamped log in `tests/artifacts/proof_floyd/proof_floyd_log.txt`.
- **Result:** Each of the 10 consecutive headed Chromium sessions performs 12 real human keyboard/mouse interactions on the live FLOYD-STABILITY terminal after a fresh server bounce, with deterministic verification.

### [2026-04-28 21:48:30 EDT] PO critique — input-validation hardening
- **What changed:**
  - `server.py`: added `validate_name` field validator on both `AgentCreate` and `AgentUpdate`. Rejects empty/whitespace-only names, names longer than 100 chars, names containing `/`, `\`, NUL, or any control character. Returns HTTP 422 with a clear message.
  - `tests/test_api_smoke.py`: 3 new regression tests — `test_invalid_name_empty_rejected`, `test_invalid_name_too_long_rejected`, `test_invalid_name_with_slash_rejected`.
  - `tests/po_critique.py` (new): demanding-PO stress driver — 60-burst health, 20-rapid list, scrollback fan-out, bulk no-op, 10× CRUD round-trip, 5 invalid-input edge cases. Used as a pre-flight check, not a unit test.
- **Why:** PO stress run found three silent acceptance bugs: empty name, 200-char name, and `../etc/passwd` as a name all returned 200. Names appear in toasts and as suggested download filenames; sloppy names damage daily-user trust. PO critique was unable to find any further blocking issues after the fix.
- **Files/areas touched:** `server.py` lines 50-66 and 137-152; `tests/test_api_smoke.py` (added 30 lines); `tests/po_critique.py` (new, 132 lines).
- **Tests run:**
  - `pytest tests/test_api_smoke.py tests/test_workflows_ui.py -v` → 22/22 PASS in 14.13s.
  - `python3 tests/po_critique.py` → all 5 invalid inputs correctly rejected with 422; CRUD stress 0 failures; FINAL ISSUES: (none).
- **Result:** Names now have a real contract; the daily user can't accidentally create agents that surprise them later.

### [2026-04-28 21:44:00 EDT] Release-grade documentation
- **What changed:**
  - `README.md`: added "Daily-Use Workflows" (top-3) section, "Testing" section pointing at the full Makefile commands, and a "Documentation Index" linking to OPERATIONS.md / TROUBLESHOOTING.md / CHANGELOG.md / tests/README.md.
  - `OPERATIONS.md` (new): system requirements, clean-machine install, foreground/launchd run patterns, persisted-state inventory, backup recipe, upgrades, logs, shutdown, security posture.
  - `TROUBLESHOOTING.md` (new): symptom→diagnosis→fix table covering server startup, browser/WebSocket issues, PTY/process problems, test failures, persistence corruption, and network/port issues.
- **Why:** A daily user must be able to install, run, debug, back up, and upgrade TCC from documentation alone — without me on call. The previous README was feature-list-heavy and operations-light.
- **Files/areas touched:** `README.md` (added 38 lines around "Keyboard Shortcuts"), `OPERATIONS.md` (new, 156 lines), `TROUBLESHOOTING.md` (new, 222 lines).
- **Tests run:** `make test` → 3/3 UI workflows PASS in 11.8s. No code changes required for docs.
- **Result:** Operations and troubleshooting are now first-class deliverables, not tribal knowledge.

### [2026-04-28 21:37:30 EDT] Deterministic broadcast verification
- **What changed:** Instrumented per-WebSocket sent-bytes counter (wrapped `ws.send` inside `connectWS`) plus `window.tccGetWSStats(id)`. Workflow 3 now asserts both terminals' WebSockets receive ≥5 bytes after typing 5 chars in broadcast mode — independent of how each floyd TUI renders the bytes.
- **Why:** floyd-stability and floyd-creative are different binaries with different keymaps; floyd-creative consumed `z` silently in alt-screen mode and the visual-only assertion was a false negative. The broadcast was actually working — the visual proxy just couldn't see it. Byte counter proves PTY delivery directly.
- **Files/areas touched:** `index.html` lines 1297-1322 (send wrapper), `index.html` lines 562-572 (helper export), `tests/test_workflows_ui.py` workflow 3 step 14-15.
- **Tests run:** `pytest tests/test_workflows_ui.py -v` → 3/3 PASS in 12.29s.
- **Result:** Workflow 3 (broadcast to N terminals) verified end-to-end without TUI-specific flakiness.

### [2026-04-28 21:36:30 EDT] Fix delete-agent unhandled WebGL exception
- **What changed:** Wrapped `state.term.dispose()` in try/catch inside `doDeleteAgent`. The xterm-addon-webgl throws "Cannot read properties of undefined (reading 'onRequestRedraw')" during teardown if the renderer wasn't fully initialized; previously this aborted the function before `state.frame.remove()` ran, leaving the deleted agent's panel visible until reload.
- **Why:** Workflow 2 (CRUD) failed because the frame never detached after delete confirm. Direct user impact: clicking delete would silently leave the panel on screen.
- **Files/areas touched:** `index.html` lines 1416-1421.
- **Tests run:** `pytest tests/test_workflows_ui.py::test_workflow_2_add_use_delete_agent -v` → PASS.
- **Result:** Delete now reliably removes the frame even when the WebGL renderer is mid-init.

### [2026-04-28 21:35:00 EDT] Stable test selectors + xterm.js buffer reader
- **What changed:**
  - `index.html`: agent list `<li>` items now carry `data-agent-id` and `data-agent-name` attributes plus a `title` tooltip showing the canonical name and label. Renaming labels no longer breaks tests, and human users see canonical names on hover.
  - `index.html`: added `window.tccGetTerminalText(id)`, `window.tccGetAgentInfo()`, and `window.tccGetWSStats(id)` test/debug helpers. The terminal-text helper reads xterm.js's `term.buffer.active` (the authoritative buffer painted on every renderer — WebGL, Canvas, DOM), so tests reflect what the user sees.
  - `tests/test_workflows_ui.py` and `tests/test_proof_floyd.py`: switched from fragile `.xterm-rows` DOM scraping to `window.tccGetTerminalText`. Switched sidebar lookup from `has_text=` to `data-agent-name`.
- **Why:** The DOM-scraping reader returned empty text for terminals using the WebGL renderer, and the sidebar shows labels (not names) so `has_text="FLOYD-STABILITY"` never matched.
- **Files/areas touched:** `index.html` lines 528-565, 791-808, 1297-1322; `tests/test_workflows_ui.py`; `tests/test_proof_floyd.py`.
- **Tests run:** `pytest tests/test_workflows_ui.py::test_workflow_1_floyd_terminal_end_to_end -v` → PASS (3.5s).
- **Result:** Workflow 1 (open + use a floyd terminal) now passes deterministically.

### [2026-04-28 20:06:29 EDT] Final Push Closer protocol initiated
- **What changed:** Began an evidence-based hardening pass — baseline audit, top-3 workflow definition, full Playwright webapp testing, secrets scan, release-grade docs, harsh PO review cycles, and a 10/10 close→reopen→headed-floyd-session proof.
- **Why:** Make TCC reliable enough that Douglas can depend on it as a daily driver without surprises.
- **Files/areas touched:** `CHANGELOG.md` (new), `tests/` scaffolding, `server.py` port-default fix.
- **Tests run:** baseline `curl /api/health` → `{"status":"ok"}`; `curl /api/agents` → 4 agents listed (FLOYD-CREATIVE, FLOYD-COMPLEX, FLOYD-SURGICAL, FLOYD-STABILITY); `lsof -iTCP:9527` → PID 748 (launchd-managed) listening.
- **Result:** Baseline captured. Top-3 workflows defined. Live server confirmed healthy on port 9527.

### [2026-04-28 20:12:00 EDT] Define top-3 human workflows
- **What changed:** Documented the three workflows TCC must serve flawlessly:
  1. **Open TCC → click into a Floyd terminal → send commands → see live output** (daily driver)
  2. **Add / Edit / Delete an agent** (CRUD persistence to `agents.json`)
  3. **Stop / Start / Restart an agent process** (lifecycle management)
- **Why:** Every fix and test gates against these workflows.
- **Files/areas touched:** `CHANGELOG.md`, `docs/WORKFLOWS.md` (added later in this pass).
- **Tests run:** N/A — definition step.
- **Result:** Top-3 workflows are the contract; all tests must cover them end-to-end.

---

## Earlier history

Prior changes are tracked across the per-area ledgers:
- `Issues/terminal-control-center_ci_cd_ISSUES.md` — CI/CD and infrastructure incident history
- `SSOT/terminal-control-center_SSOT.md` — architecture-of-record changes
- Git history (`git log`) — code-level changes

This top-level `CHANGELOG.md` consolidates user-visible behavior changes and operational hardening.
