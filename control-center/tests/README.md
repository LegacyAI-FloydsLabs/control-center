# TCC Test Suite

End-to-end tests for the top-3 human workflows plus a 10/10 close→reopen proof for the floyd
agent harness. Built on **pytest + Playwright (Python)** running against a live TCC server.

## Layout

```
tests/
├── README.md                  — this file
├── conftest.py                — shared pytest fixtures (httpx client, browser, etc.)
├── _helpers.py                — server lifecycle + small utilities
├── test_api_smoke.py          — fast HTTP-level regression: every advertised endpoint
├── test_workflows_ui.py       — Playwright UI tests for the three top workflows
├── test_proof_floyd.py        — the 10/10 close→reopen→headed-floyd proof (skipped by default)
├── llm_benchmark.py           — pre-existing Ollama-backed LLM-tool-use benchmark
└── artifacts/                 — screenshots, traces, logs (gitignored)
```

## Prerequisites

```bash
# Activate the project venv
source .venv/bin/activate

# Already installed during the hardening pass:
pip install playwright pytest pytest-asyncio httpx
playwright install chromium
```

## How to run

```bash
# Fast smoke tests (HTTP only) — under 5 seconds against a running server
pytest tests/test_api_smoke.py -v

# UI workflow tests — headless Chromium, ~30 seconds
pytest tests/test_workflows_ui.py -v

# Headed mode for visual debugging
HEADED=1 pytest tests/test_workflows_ui.py -v

# The full 10/10 floyd proof (kills + restarts the server, runs headed) — opt-in:
RUN_PROOF=1 pytest tests/test_proof_floyd.py -v -s
```

By default the suite expects **TCC to already be running on port 9527**. Override with
`TCC_BASE=http://localhost:9528 pytest …`.

## What the workflows cover

| # | Workflow | Test file | Coverage |
|---|----------|-----------|----------|
| 1 | Open TCC → click into a terminal → send commands → see output | `test_workflows_ui.py::test_workflow_send_command` | Page loads, agent list renders, frame appears for the floyd agent, WS connects, command goes through PTY, output streams back |
| 2 | Add / Edit / Delete an agent | `test_workflows_ui.py::test_workflow_crud` | Form validation, persistence to `agents.json`, sidebar update, deletion cleanup |
| 3 | Stop / Start / Restart an agent | `test_workflows_ui.py::test_workflow_lifecycle` | Restart button works, process recycles, status dot transitions |

Edge cases also covered:
- Refresh / back-button — terminals reattach to surviving processes
- Multiple browser tabs — both attach to the same process; both see the same output
- Invalid input — schema validation surfaces a 422 with a helpful message
- Server restart — auto-start agents come back; persisted state honored
- Slow / blocked PTY — `wait_until` + `timeout` on `/api/llm/do` behave correctly

## The 10/10 proof

`test_proof_floyd.py` is the closer. It:

1. Snapshots the current launchd state of `com.legacyai.tcc`
2. Cleanly stops the server via `launchctl kickstart -k`
3. Waits for `/api/health` to return after relaunch
4. Loops 10 times: open headed Chromium → load TCC → trigger a floyd terminal → send a simple
   command → assert expected output → close the browser
5. Each iteration logs a timestamped pass/fail row to `tests/artifacts/proof_floyd_log.txt`

A run is **only** counted as proof if all 10 iterations succeed. Any iteration that fails or
times out aborts the run and prints diagnostics. To re-run: `RUN_PROOF=1 pytest tests/test_proof_floyd.py -v -s`.

## Reproducing failures

Every test that uses the browser saves a screenshot, the page HTML, and the console log to
`tests/artifacts/<test_name>/` on failure. Open the screenshot first; if the failure looks like a
WebSocket issue, look at `console.log` for handshake errors.

## CI guidance

This suite is designed to run against a long-lived TCC server (the launchd-managed instance on the
developer's Mac). For headless CI, start the server in a sidecar and point `TCC_BASE` at it. The
proof test is **not** suitable for CI — it intentionally restarts the server and uses headed mode.
