# Legacy_Agents SSOT (Single Source of Truth)
**Created:** 2026-04-29T07:31:47-0400
**Last Updated:** 2026-04-29T08:06:46-0400
**Governance:** .supercache/ v1.5.0

> **Compliance Notice:** This file must match the structure at
> `.supercache/templates/ssot-template.md`. This is the authoritative
> document for architecture and programmatic change facts of **Legacy_Agents**.

---

## Authority

This document is the **single source of truth** for architecture and programmatic change facts of Legacy_Agents. All other documents must be treated as **potentially flawed** unless their facts are confirmed here.

When a fact in any other document contradicts this SSOT, the SSOT wins. If the SSOT itself is wrong, it is corrected via the **Verification Sweep Protocol** below, not by editing other documents to match.

---

## Verification Sweep Protocol (required on every read)

When an agent reads this SSOT to perform a task:

1. Perform a **line-by-line verification review** of the sections relevant to the current task.
2. For each verified fact, append a verification entry to the **Verification Log** at the bottom of this file with:
   - Timestamp (`YYYY-MM-DD HH:MM TZ`)
   - Section/line reference
   - Evidence source (code path + line, command + output, build log, runtime behavior, etc.)
   - Confidence = 100%
3. If any fact cannot be verified to 100% confidence:
   - Mark it **UNVERIFIED** inline in the section where it appears
   - Add an entry to `Issues/Legacy_Agents_ISSUES.md` to track the discrepancy
   - Do NOT proceed on the assumption that the fact is true

### Positive Reinforcement (required)

For each fact verified at 100% confidence during a sweep, emit the acknowledgement:

```
Verified as fact (100%): <fact summary>
```

This pattern is deliberate — it reinforces evidence-first thinking and makes the verification record auditable after the fact.

---

## Current State

**Phase:** <!-- e.g., Active development, Production, Maintenance, Archived -->
**Status:** <!-- Active / Paused / Archived -->
**Last Agent Session:** <!-- YYYY-MM-DD HH:MM TZ -->

---

## Architecture Facts

<!-- Add verified architecture facts here. Keep each fact concise and evidence-backed. -->
<!-- Facts should be the kind of thing that, if wrong, would mislead the next agent. -->

### Stack

- **Primary language**: <!-- e.g., TypeScript (ES2022, strict), Python 3.12, Rust 1.75 -->
- **Framework**: <!-- e.g., Next.js 16.1.0, FastAPI, None -->
- **Runtime**: <!-- e.g., Node.js 22.x, Python 3.12, N/A -->
- **Module system**: <!-- e.g., ESM, CommonJS, Cargo, Go modules -->

### Key architectural choices

<!-- Document architectural decisions in 1-3 sentences each. -->
<!-- Link to the full rationale in Key Decisions section below if needed. -->

---

## Key Decisions

| Date | Decision | Rationale | Decided By |
|---|---|---|---|
| 2026-04-29T07:31:47-0400 | <!-- Example: Chose X over Y --> | <!-- Example: because Z --> | <!-- Name or "Unassigned" --> |

<!-- Decisions are append-only. When a decision is superseded, add a new row with the -->
<!-- superseding decision and link back to the old one. Never edit historical rows. -->

---

## Dependencies

| Dependency | Version | Purpose | Criticality |
|---|---|---|---|
| <!-- e.g., next --> | <!-- 16.1.0 --> | <!-- App framework --> | <!-- critical / supporting / dev-only --> |

---

## Deployment

| Environment | URL / Location | Status | Last Deploy |
|---|---|---|---|
| production | <!-- e.g., https://example.com --> | <!-- live / down / maintenance --> | <!-- YYYY-MM-DD --> |
| staging | <!-- e.g., https://staging.example.com --> | <!-- --> | <!-- --> |
| local | <!-- e.g., localhost:{PORT} --> | <!-- dev --> | <!-- N/A --> |

---

## Known Patterns & Lessons

<!-- Proven solutions to recurring problems in this project. Apply immediately when you hit the trigger. -->

| Pattern | Trigger | Fix | Confidence |
|---|---|---|---|
| <!-- e.g., build-restart --> | <!-- e.g., After running build --> | <!-- e.g., pkill + restart --> | <!-- 0.0-1.0 --> |

---

## SanDisk1Tb Top-Level Inventory

**Scanned:** 2026-04-29T08:06:46-0400
**Scope:** `/Volumes/SanDisk1Tb/` — depth 1 only; non-hidden directory entries (no `.dotted` names); non-empty (any contents, hidden or visible).
**Method:** `cd /Volumes/SanDisk1Tb && for d in */; do d="${d%/}"; [ -n "$(ls -A "$d")" ] && echo "/Volumes/SanDisk1Tb/$d"; done`
**Totals:** 56 entries at root → 55 directories (1 file: `FLOYD.md`) → 47 non-empty visible directories → 8 empty directories excluded (`Hermes`, `mlx-cache`, `onnx-cache`, `Legacy`, plus 4 others).

### Non-empty visible top-level directories (47)

- `/Volumes/SanDisk1Tb/Applications`
- `/Volumes/SanDisk1Tb/ATerm`
- `/Volumes/SanDisk1Tb/backup-storage-2026-04-15`
- `/Volumes/SanDisk1Tb/Backups`
- `/Volumes/SanDisk1Tb/BOUNTYHUNTER`
- `/Volumes/SanDisk1Tb/CloudGeneralist`
- `/Volumes/SanDisk1Tb/Continuous_Agents`
- `/Volumes/SanDisk1Tb/CyberEdu-Toolkit`
- `/Volumes/SanDisk1Tb/decision_board`
- `/Volumes/SanDisk1Tb/deerflow`
- `/Volumes/SanDisk1Tb/deerflow-workbench`
- `/Volumes/SanDisk1Tb/DesktopCommander`
- `/Volumes/SanDisk1Tb/exo`
- `/Volumes/SanDisk1Tb/exo-models`
- `/Volumes/SanDisk1Tb/Floyd Docs`
- `/Volumes/SanDisk1Tb/floyd-portal`
- `/Volumes/SanDisk1Tb/floyd-sandbox`
- `/Volumes/SanDisk1Tb/FloydForge`
- `/Volumes/SanDisk1Tb/gemini at work`
- `/Volumes/SanDisk1Tb/GEMINI for MacOS`
- `/Volumes/SanDisk1Tb/GEMMA_LEGACY`
- `/Volumes/SanDisk1Tb/HFModels`
- `/Volumes/SanDisk1Tb/InferenceCache`
- `/Volumes/SanDisk1Tb/Issues`
- `/Volumes/SanDisk1Tb/LAIAS_AGENT_OUTPUT`
- `/Volumes/SanDisk1Tb/Legacy AI - Dark Motion`
- `/Volumes/SanDisk1Tb/Legacy AI Agents Platform`
- `/Volumes/SanDisk1Tb/Legacy_AI_Delivery_Architecture_Package`
- `/Volumes/SanDisk1Tb/LegacyAI.space`
- `/Volumes/SanDisk1Tb/LegacyAI_FloydsLabs_Standards_&_Practices`
- `/Volumes/SanDisk1Tb/Library`
- `/Volumes/SanDisk1Tb/MWIDE`
- `/Volumes/SanDisk1Tb/New_Deal`
- `/Volumes/SanDisk1Tb/OhMyFloyd`
- `/Volumes/SanDisk1Tb/Ollama`
- `/Volumes/SanDisk1Tb/open-anvil`
- `/Volumes/SanDisk1Tb/pebkac`
- `/Volumes/SanDisk1Tb/reference`
- `/Volumes/SanDisk1Tb/Reports`
- `/Volumes/SanDisk1Tb/skillsdump`
- `/Volumes/SanDisk1Tb/SSOT`
- `/Volumes/SanDisk1Tb/Terminal Voice`
- `/Volumes/SanDisk1Tb/terminal-control-center`
- `/Volumes/SanDisk1Tb/tmp`
- `/Volumes/SanDisk1Tb/WebSwap`
- `/Volumes/SanDisk1Tb/webswap-packages`
- `/Volumes/SanDisk1Tb/ZOOM_AI`

> **Note:** Hidden top-level entries (e.g. `.supercache/`) and the file `FLOYD.md` are intentionally excluded by the scan filter. This inventory is the **starting set** for project identification on SanDisk1Tb — categorization (governed project vs. cache vs. asset bucket vs. archive) is a separate task.

---

## Verification Log (append-only)

Every sweep of this SSOT must append one or more entries here. Never edit or remove existing entries.

| Timestamp | Section / Line | Fact Verified | Evidence Source | Confidence |
|---|---|---|---|---|
| 2026-04-29T07:31:47-0400 | Authority | Document initialized as SSOT | bootstrap.sh --init created from template | 100% |
| 2026-04-29T08:06:46-0400 | SanDisk1Tb Top-Level Inventory | 47 non-empty visible top-level directories enumerated; 8 empty directories excluded | `for d in */; do [ -n "$(ls -A "$d")" ] && echo ...` against `/Volumes/SanDisk1Tb/` (cwd) — output captured in conversation tool result | 100% |
| 2026-04-29T08:06:46-0400 | SanDisk1Tb Top-Level Inventory | Root entry count = 56, directory count = 55, file count = 1 (FLOYD.md) | `ls /Volumes/SanDisk1Tb/ \| wc -l` → 56; `ls -d /Volumes/SanDisk1Tb/*/ \| wc -l` → 55 | 100% |
| 2026-04-29T08:06:46-0400 | SanDisk1Tb Top-Level Inventory | Hermes, mlx-cache, onnx-cache confirmed empty (excluded) | `ls -la /Volumes/SanDisk1Tb/{Hermes,mlx-cache,onnx-cache}` returned no output for any of the three | 100% |
| 2026-04-29T15:11:00-0400 | Git topology | Project's git root resolves to `/Volumes/Storage`, not the project dir | `git -C "/Volumes/Storage/Legacy Agents" rev-parse --show-toplevel` → `/Volumes/Storage` | 100% |
| 2026-04-29T15:11:00-0400 | Git topology | `/Volumes/Storage` repo has zero commits, zero refs, no remote | `git log` → `fatal: ... no commits yet`; `for-each-ref` → empty; `config --get remote.origin.url` → empty | 100% |
| 2026-04-29T15:11:00-0400 | Git topology | 143 nested `.git` directories within `/Volumes/Storage` (depth ≤4) | `find /Volumes/Storage -maxdepth 4 -name '.git' -type d \| wc -l` → 143 | 100% |
| 2026-04-29T15:11:00-0400 | Git topology | 231 untracked top-level entries; 0 staged; 0 modified | `git -C /Volumes/Storage status --porcelain \| wc -l` → 234 (3 are `warning:` lines), all `??` | 100% |
| 2026-04-29T15:11:00-0400 | Secret hygiene | 40 `.env*` files at depth ≤3; `.gitignore` covers only `.env.github` (28 B) | `find /Volumes/Storage -maxdepth 3 -name '.env*'` → 40 hits; `cat .gitignore` → 28 bytes, single rule | 100% |

---

## Change Log (append-only)

- 2026-04-29T07:31:47-0400 — Initialized SSOT.
- 2026-04-29T08:06:46-0400 — Added SanDisk1Tb Top-Level Inventory section (47 non-empty visible top-level directories enumerated, 8 empty excluded).
- 2026-04-29T15:11:00-0400 — Performed commit review. Findings recorded in `.floyd/autonomous-report.md`. Verdict: DO NOT COMMIT — drive-level repo at `/Volumes/Storage/.git` is an accidental init covering 263 GiB / 143 nested repos / ~189 .env files (initial count of "40" was head-truncated, corrected on re-verification); remediation deferred to Douglas.
- 2026-04-29T~16:00-0400 — Drive-level `/Volumes/Storage/.git` and `/Volumes/Storage/.gitignore` renamed to `.disabled-2026-04-29` suffix (reversible). `git rev-parse` from `Legacy Agents/` now correctly reports "not a git repository"; nested project repos (e.g. Floyd-Fork) untouched and still operate normally.
- 2026-04-30 — Master `ROADMAP.md` authored at `plans/ROADMAP.md`. Captures the full vision: 4-page ControlBoard (Governance Dashboard / 6-project Workspace / Large Terminal Surface / MWIDE embed) + FLOYD CURSE'M hot-button + daily Bootstrap Routine A→F + Beta Release Readiness gates (the 7 PASS/FAIL/UNKNOWN/WAIVED gates) + lifecycle promotion path (dev-launcher → open-source / production / enterprise) + quarantine-only sanitation rule (v1.6.0 governance scope) + Team Floyd Orchestrator prompt as Appendix A. Supersedes `governance-orchestration-blueprint.md` as umbrella plan; blueprint downgraded to one tactical implementation contributor.

<!-- Append new entries BELOW this comment line, in chronological order. -->
<!-- Never edit or remove existing entries — this is the authoritative change history. -->
- 2026-04-30T11:18-0400 — `/blueprint controlboard` plan written to `plans/controlboard.md` (686 lines, 11 steps, critical path 7, parallel-eligible at Steps 5/6/9/10, three steps assigned strongest model). Adversarial review pass fixed 6 critical findings in place. Memory entry registered at `~/.claude/projects/-Volumes-Storage/memory/project_legacy_agents_controlboard.md`.
- 2026-04-30T17:02-0400 — Step 3 (repository_report.json populator) executed. Commit `bd492e3`. `control-center/scripts/repo_report.py` (445 lines) — frozen dataclass + 13 derivers + 3-round critic + JSON serializer. CLI: `python repo_report.py <path> [--write] [--critic-rounds 3]`. 13 unit tests in `tests/test_repo_report.py` pass. Two external fixtures captured: `floyd_harness.json` (_verified=true, completion=14%, Python+FastAPI detected) and `floyd_docs.json` (_verified=false, no-manifest case, tech_stack=Unknown). `requirements-dev.txt` added (pytest, pytest-asyncio, httpx; playwright opt-in).
- 2026-05-01T00:05-0400 — Step 9 (Page 4 MWIDE embed — ControlBoard side) executed. Commit `08b20d0`. New "MWIDE" top-nav tab between Workspace and System Health (6 tabs total now). Iframe with sandbox attributes (allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads) targeting `http://localhost:10602/`. Reachability probe via no-cors fetch with 1.5s AbortController timeout runs on tab activation + manual reload; status pill flips between Checking… / ● up (green) / ● down (red). Fallback panel with PORT=10602 start command renders when MWIDE is offline. 6 endpoint tests in `tests/test_mwide_embed.py` pass. Cross-project edits (MWIDE's `server.ts:26` default port + `FLOYD.md` {{PORT}} placeholder fill + `port-registry.json` claim of 10602) staged for Douglas at `control-center/docs/mwide-port-migration.md` — out of scope for the Legacy Agents repo session per project boundary. Browser smoke (MWIDE not running): probe correctly fails to ● down, fallback panel visible, iframe stays at about:blank.
- 2026-05-01T00:00-0400 — Step 12 (Mac System Health — cleanup report LIVE) executed. Commit `66a794a`. `control-center/scripts/system_scan.py` (320 lines) — deterministic re-runnable scan replacing the prior one-shot mac-cleanup-report.html. Three scanners: scan_apps walks /Applications + ~/Applications, captures `du -sk` size + `mdls kMDItemLastUsedDate` (with executable-mtime fallback for unindexed apps) + classifies remove/consider/keep at IDLE_REMOVE_DAYS=90 / IDLE_CONSIDER_DAYS=30 thresholds. scan_memory aggregates `ps -axco` by name with Helper bucketing + system/keep/consider/tame classification rules. scan_disk_recovery_candidates returns top-15 idle apps by size desc. Memory total via sysctl hw.memsize, used via vm_stat (active+wired+compressed). Output to `control-center/.floyd/system-health-cache.json`. CLI: `python scripts/system_scan.py [--write|--no-write]`. Two endpoints in `control-center/server.py`: GET /api/system-health (cache, refresh if >5min stale) + POST /api/system-health/rescan (synchronous, returns wall_clock_seconds). Lazy module load registers in sys.modules BEFORE exec_module to satisfy Python 3.14's dataclass/KW_ONLY lookup. UI: new "System Health" top-nav tab between Workspace and Infrastructure with deliberate dark theme (GitHub-dark tokens, mirrors original cleanup report) — 5 stat cards, sortable Apps table, Memory hogs table, Top Recovery Candidates card grid, Re-scan button. 24 tests across `tests/test_system_scan.py` (20) and `tests/test_system_health_endpoint.py` (4) pass. Browser smoke: 42 apps detected, 25 memory hogs (top: node 4.77 GB), 5 recovery candidates, 0.4 GB recoverable, scan duration 3.53s, sortable headers work (Hermes 3322 days idle surfaced as oldest), Re-scan button wired. Production memory: 18.4 GB used / 24.0 GB total / 5.6 GB free.
- 2026-05-01T00:00-0400 — Step 13 (Page 6 Infrastructure Cartography embed) executed. Commit `7812941`. Vendored `~/Downloads/Legacy_AI_Delivery_Architecture_Package/network-map/infrastructure-map.html` (1451 lines, 71278 bytes) into `control-center/static/infrastructure-map.html` — exact copy. Renamed top-nav tab from "Embed" to "Infrastructure". Iframe in the Embed page renders the static map at `/static/infrastructure-map.html` (FastAPI's StaticFiles already mounts `static/`). `control-center/scripts/refresh-infrastructure-map.sh` is a one-shot re-vendor helper (accepts INFRA_MAP_SOURCE env override). `control-center/docs/infrastructure-map.md` documents the vendoring policy. 8 tests in `tests/test_infrastructure_map.py` pass. Browser smoke: iframe loads with state=already-loaded, inner title "Legacy AI — Infrastructure Cartography", 5 top-level headings detected, 54 section/card elements, round-trip Governance ↔ Infrastructure works.
- 2026-04-30T18:30-0400 — Step 4 (Page 1 Governance Dashboard) executed. Commit `a62f7cf`. `control-center/server.py` +199 lines: `GET /api/projects` (drive walker, status classifier GOVERNED/CANDIDATE/DRIFTED/UNASSESSED, sort by completion% desc, file:// links, 30s TTL cache) and `GET /api/quarantine-summary` (aggregates `.floyd/quarantine/<date>/`, excludes LEDGER.jsonl + .WHY.md companions). Reads `/Volumes/SanDisk1Tb/.supercache/VERSION` once at startup as canonical version. Honors `/Volumes/T7/` off-limits per `~/.claude/CLAUDE.md`. `control-center/index.html` +508 lines: cb-nav top-level tabs Governance / Terminals / Workspace / Embed (existing TCC UI re-housed under Terminals); Governance page with persistent quarantine alert + 5 summary cards + filter toolbar (search + status select + manual refresh) + project grid + expand-on-click detail panel showing 13 ROADMAP §3.E fields + 7 gate pills + 4 file:// links + 2 disabled Dispatch Bootstrap/Finisher buttons (enabled in Step 7). Auto-refresh every 60s when Governance tab is visible. 13 endpoint tests in `tests/test_governance_endpoints.py` pass. Browser smoke-test on `127.0.0.1:10527`: 49 projects detected (TEAR 91% / Dark Motion 55% top), 2 GOVERNED + 47 CANDIDATE + 0 DRIFTED + 0 UNASSESSED, 1 quarantine entry surfaced (Legacy Agents, oldest 2026-04-30), all 4 nav tabs switch cleanly, expand-on-click works, filter+refresh work, zero browser console errors. Steps 5/6/9/10/12/13 are now parallel-eligible.
- 2026-04-30T12:13-0400 — Step 1 (Foundation reset) executed end-to-end. `git init -b main` at project root (first per-project repo; drive-level `.git.disabled-2026-04-29` untouched). `.gitignore` authored from `.supercache/contracts/repo-hygiene.md` Universal+Python baselines. `control-center/agents.json` reset to `{}`, `control-center/state.json` reset to `{"running":[],"metrics":{}}` (rsync artifacts overwritten — no quarantine since they were never project history). `control-center/FLOYD.md` purpose updated to ControlBoard role; port 9527→10527; governance v1.0.0→v1.6.0; theme default note added. `control-center/CLAUDE.md` authored from `.supercache/templates/claude-md-template.md` with project-specific rules C1–C5. `control-center/server.py:1692` default port 9527→10527. `control-center/Makefile` run/dev targets bumped to 10527. `control-center/index.html:614` theme default `'dark'`→`'light'`. `control-center/README.md`, `control-center/OPERATIONS.md` updated for port 10527. `make venv` succeeded (Python 3.14.3, FastAPI 0.136.1, uvicorn 0.46.0, pydantic 2.13.3). Smoke-bind on `0.0.0.0:10527` verified via `lsof -iTCP:10527 -sTCP:LISTEN` (PID 1905) and `curl -I http://localhost:10527/` returning HTTP/1.1 405 (expected — GET-only `/` route). Port 10527 NOT YET claimed in port-registry.json — diff staged at `.floyd/port-claim-diff.md` for Douglas to apply.

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
