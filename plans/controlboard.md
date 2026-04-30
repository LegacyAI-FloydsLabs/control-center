# Plan — controlboard

**Objective:** Build the Legacy AI ControlBoard per `plans/ROADMAP.md` — a 4-page operational dashboard at `/Volumes/Storage/Legacy Agents/control-center/` (TCC fork on port 10527) that hosts the daily bootstrap routine A→F, governance gates monitor, 6-project workspace, large terminal surface (sidepanel-style dual-terminal layout), MWIDE embed, FLOYD CURSE'M launcher hot-button, quarantine alert pipe driven by `.floyd/quarantine/` across the governed portfolio (v1.6.0 `repo-sanitation.md`), `repository_report.json` refresh per `repository-report-spec.md`, daily bootstrap routine A→F, and Team Floyd Orchestrator hookup.

**Created:** 2026-04-30
**Generator:** `/blueprint` skill
**Authoritative source:** `plans/ROADMAP.md` (this plan implements it)
**Mode:** Direct (no git repo at project root yet — Step 1 fixes this; fully PR/CI mode kicks in from Step 2 onward)
**Step count:** 11
**Parallelizable:** Steps 5, 6, 9, 10 can run concurrently after Step 4
**Critical path:** 1 → 2 → 3 → 4 → 7 → 8 → 11 (7 sequential)

---

## Pre-flight invariants (verified at plan creation)

| Check | Result |
|---|---|
| `git status` at project root | NOT a git repo (parent drive `.git` was disabled 2026-04-29; project never `git init`'d) |
| `gh auth status` | (skipped — direct mode) |
| Source clone present | `/Volumes/Storage/Legacy Agents/control-center/` exists, ~9 MB rsync from upstream TCC |
| Upstream TCC | `/Volumes/SanDisk1Tb/terminal-control-center/` — UNTOUCHED throughout this plan; lives at port 9527 with the user's daily Floyd CREATIVE/COMPLEX/SURGICAL/STABILITY agents |
| v1.6.0 / v1.6.1 governance | Staged at `~/legacy-governance-pending/`. v1.6.0 must apply before Step 2 (uses quarantine helper). v1.6.1 must apply before Step 7 (uses no-delete enforcement during dispatched bootstraps) |
| repo-sanitation.md authority | `<project>/.floyd/quarantine/<YYYY-MM-DD>/<rel-path>` + WHY.md + LEDGER.jsonl. NEVER `rm`. Use `floyd-quarantine` helper installed by v1.6.1 |
| Port 10527 | Currently free; not in `/Volumes/SanDisk1Tb/SSOT/port-registry.json` — Step 1 claims it |
| Port 10602 (MWIDE) | Currently free; not in port-registry — Step 9 claims it |

## Cross-cutting rules (apply to every step)

1. **Code is truth.** Every claim about behavior cites a file:line or command:output. No "should" / "probably".
2. **No deletions.** Every removal goes through `floyd-quarantine <path> --reason <category> --note "<why>"`. The hook installed by v1.6.1 enforces this; agents that try `rm` get blocked.
3. **One worker per packet.** Fresh worker context for each step. No "continue from previous worker".
4. **Light theme by default.** The DeepSeek prototype was dark; the ControlBoard is intentionally light. TCC already supports both — just default to light.
5. **Read `plans/ROADMAP.md`** before starting any step. The roadmap is the *what* and *why*; this plan is the *how*.
6. **Single-user localhost.** No auth surgery. Matches upstream TCC posture (`OPERATIONS.md:152-157`).
7. **Update `SSOT/Legacy_Agents_SSOT.md`** at the end of every step with one append-only change-log line. Update `Issues/Legacy_Agents_ISSUES.md` for any deferred follow-ups.

---

## Step 1 — Foundation reset

**Objective:** Convert the rsync'd TCC clone into a Legacy Agents ControlBoard project: own git repo, clean state, port 10527 claimed, FLOYD.md/CLAUDE.md customized, light theme defaulted.

**Context brief (cold-start):**
- Project is at `/Volumes/Storage/Legacy Agents/control-center/`. It's an rsync of `/Volumes/SanDisk1Tb/terminal-control-center/` from 2026-04-28, missing `.venv`, `.git`, `.pytest_cache`. The clone still has the **upstream's `agents.json`** with live FLOYD-CREATIVE/COMPLEX/SURGICAL/STABILITY entries plus three test artifacts (`""` blank-name agent, `xxxx...` 200-char-name agent, `../etc` path-traversal agent). State files (`agents.json`, `state.json`) need reset.
- `control-center/FLOYD.md` still says it's the upstream TCC at port 9527 v1.0.0 — needs to point to ControlBoard role at port 10527 with current governance version.
- TCC's index.html supports light + dark. The default should be light for the ControlBoard (DeepSeek's failed prototype was dark; the redesign deliberately switches).
- Project root `Legacy Agents/` has no git. The drive-level `.git` was disabled 2026-04-29 (`/Volumes/Storage/.git.disabled-2026-04-29`). This step initializes a per-project git inside `Legacy Agents/`.

**Tasks:**
1. `cd "/Volumes/Storage/Legacy Agents" && git init -b main`
2. Author `.gitignore` per `repo-hygiene.md` Universal + Python baseline (covers `.DS_Store`, `.venv/`, `__pycache__/`, `.floyd/`, `.env`, secrets patterns)
3. Reset `control-center/agents.json` to `{}` (the existing content is an rsync artifact from upstream TCC, NOT this project's history — overwrite directly, no quarantine needed; v1.6.1 hook is not required for Step 1): `echo '{}' > control-center/agents.json`
4. Reset `control-center/state.json` similarly (`echo '{"running":[],"metrics":{}}' > control-center/state.json`)
5. Customize `control-center/FLOYD.md`:
   - Header: `**Version:** 1.0.0` → keep (project version, not governance version)
   - `**Governance:** .supercache/ v1.0.0` → `**Governance:** .supercache/ v1.6.1` (after v1.6.1 ships) or `v1.6.0` (after v1.6.0 ships, before v1.6.1)
   - Project-Specific Context section: change Purpose to "Legacy AI ControlBoard — 4-page operational dashboard surfacing every governed project, the daily bootstrap routine, the Beta-readiness gates, and the Team Floyd Orchestrator dispatch points"
   - Port: 9527 → 10527
   - Current Phase: Operational → "In construction (controlboard plan)"
6. Create `control-center/CLAUDE.md` via `bash /Volumes/SanDisk1Tb/.supercache/bootstrap.sh --add-claude "/Volumes/Storage/Legacy Agents/control-center"` (or write by hand from `templates/claude-md-template.md`)
7. Update `control-center/.floyd/.supercache_version` to current canonical version (1.6.1 if shipped, else 1.6.0)
8. Default the light theme: in `control-center/index.html`, find the theme initialization and switch the default from dark to light
9. Claim port 10527 in `/Volumes/SanDisk1Tb/SSOT/port-registry.json` with project name "Legacy Agents ControlBoard" (this is a write Douglas runs; agents stage the diff and ask)
10. Update `control-center/server.py` default PORT from 9527 to 10527
11. Update `control-center/OPERATIONS.md`, `control-center/README.md` to reference port 10527
12. Recreate the venv: `cd control-center && make venv` (rsync excluded `.venv`; this is a clean rebuild — Makefile target already exists)
13. Smoke-run: `.venv/bin/python server.py` → expect bind on `0.0.0.0:10527` (Ctrl+C after confirming bind)
14. First commit: `git add -A && git commit -m "feat: initialize Legacy Agents ControlBoard from TCC rsync"`

**Files touched:**
- NEW: `Legacy Agents/.gitignore`
- MODIFIED: `control-center/agents.json` (reset to `{}`)
- MODIFIED: `control-center/state.json` (reset)
- MODIFIED: `control-center/FLOYD.md`, `control-center/server.py`, `control-center/OPERATIONS.md`, `control-center/README.md`, `control-center/index.html`
- MODIFIED: `control-center/.floyd/.supercache_version`
- NEW: `control-center/CLAUDE.md`
- MODIFIED: `/Volumes/SanDisk1Tb/SSOT/port-registry.json` (Douglas-run write)
- QUARANTINED: prior `agents.json`, prior `state.json` (in `control-center/.floyd/quarantine/<date>/`)

**Verification:**
```bash
cd "/Volumes/Storage/Legacy Agents"
git rev-parse --show-toplevel | grep -F "Legacy Agents"   # expect: /Volumes/Storage/Legacy Agents
git log --oneline -1                                       # expect: one commit
test -s control-center/CLAUDE.md && echo OK
jq -r 'keys | length' control-center/agents.json           # expect: 0
grep -c "10527" control-center/server.py                   # expect: ≥1
grep -c "10527" control-center/FLOYD.md                    # expect: ≥1
jq -r '.["Legacy Agents ControlBoard"]' /Volumes/SanDisk1Tb/SSOT/port-registry.json  # expect: 10527 (or similar key)
```

**Rollback:** `git reset --hard` in the new repo + restore agents.json/state.json from the quarantine via the `mv` command in their WHY.md files.

**Exit criteria:** All verifications pass. Step 2 can start.

**Model tier:** default

---

## Step 2 — Quarantine superseded DeepSeek artifacts

**Objective:** Move the broken DeepSeek artifacts out of active use using the `floyd-quarantine` helper. They are replaced by Steps 3–4 (dashboard + report populator). Keep them in quarantine until Douglas reviews.

**Context brief (cold-start):**
- DeepSeek's session on 2026-04-29 produced two broken artifacts at the project root that need to leave active use:
  - `dashboard.html` (349 lines, broken — replaced by Page 1 in Step 4)
  - `scripts/refresh-registry.sh` (6.6K, broken `exit 1` — replaced by `/api/projects` in Step 4)
- v1.6.0/v1.6.1 governance must be in effect: `floyd-quarantine` helper installed at `~/.local/bin/floyd-quarantine`, no-delete-guard hook active.
- Per `contracts/repo-sanitation.md §3`, every quarantine emits a WHY.md and a LEDGER.jsonl line. Helper does this atomically.

**Tasks:**
1. `cd "/Volumes/Storage/Legacy Agents"`
2. `floyd-quarantine dashboard.html --reason superseded --note "DeepSeek prototype, replaced by control-center/ Page 1 governance dashboard (controlboard plan Step 4)"`
3. `floyd-quarantine scripts/refresh-registry.sh --reason broken --note "DeepSeek script, exited 1 on every run; replaced by /api/projects endpoint (controlboard plan Step 4). Quarantining the script alone — leaving the scripts/ folder in place."`
4. Verify the helper produced `WHY.md` + LEDGER append for both
5. `git add -A && git commit -m "chore: quarantine superseded DeepSeek artifacts (dashboard.html, refresh-registry.sh)"`
6. Append change-log entry to `SSOT/Legacy_Agents_SSOT.md`

**Files touched:**
- QUARANTINED: `dashboard.html` → `.floyd/quarantine/<date>/dashboard.html` + WHY.md
- QUARANTINED: `scripts/refresh-registry.sh` → `.floyd/quarantine/<date>/scripts/refresh-registry.sh` + WHY.md
- MODIFIED: `.floyd/quarantine/LEDGER.jsonl` (2 new lines)
- MODIFIED: `SSOT/Legacy_Agents_SSOT.md`

**Verification:**
```bash
cd "/Volumes/Storage/Legacy Agents"
test ! -f dashboard.html && echo "OK: dashboard.html no longer at root"
test ! -f scripts/refresh-registry.sh && echo "OK: refresh-registry.sh no longer at root"
test -f .floyd/quarantine/$(date +%Y-%m-%d)/dashboard.html && echo "OK: in quarantine"
test -f .floyd/quarantine/$(date +%Y-%m-%d)/dashboard.html.WHY.md && echo "OK: WHY.md written"
wc -l .floyd/quarantine/LEDGER.jsonl   # expect ≥2
```

**Rollback:** Run the `mv` command from each WHY.md to restore.

**Exit criteria:** Both files in quarantine, both have WHY.md, LEDGER has both entries.

**Model tier:** default

**Depends on:** Step 1 + v1.6.0/v1.6.1 applied

---

## Step 3 — `repository_report.json` schema, populator, 3-round critic

**Objective:** Author the deterministic Python tool that walks a project, derives the 13 fields defined in `ROADMAP.md §3.E`, and writes a verified `SSOT/repository_report.json`. This is the data product the entire ControlBoard renders.

**Context brief (cold-start):**
- Schema lives in `ROADMAP.md §3.E` (table of 13 fields). The existing `repository_report_template.md` at project root has a partial earlier schema — it must be expanded to match the ROADMAP table.
- The populator implements the daily bootstrap routine A→F (`ROADMAP.md §3`). Each phase produces evidence; each field has a code-derived source.
- The 3-round critic check is from `repository-report-spec.md` (DeepSeek's draft, untracked at `/Volumes/SanDisk1Tb/.supercache/contracts/repository-report-spec.md`) — read it first to understand the critic loop expectations.
- The populator is callable directly (`python control-center/scripts/repo_report.py <project-path>`) AND will later be invoked by the Bootstrap Worker (Step 7).
- Beta gates 1–7 (`ROADMAP.md §5`) populate the `gate_statuses` field. Each gate has an automated check that emits PASS/FAIL/UNKNOWN/WAIVED.
- Output: `<project-path>/SSOT/repository_report.json`. The ControlBoard's `/api/projects` endpoint (Step 4) reads these.

**Tasks:**
1. Expand `repository_report_template.md` to match `ROADMAP.md §3.E` (all 13 fields with evidence-source comments)
2. Create `control-center/scripts/repo_report.py` (Python, type-annotated, frozen dataclass for the report shape)
3. Implement field derivers (one function per field):
   - `project_name` — directory basename
   - `tech_stack` — read manifest files (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `composer.json`, `Package.swift`)
   - `complexity_score` — file count + dependency count + architecture pattern detection (use a documented rubric in a docstring)
   - `team_size_minimum` — port the rubric from `/Volumes/Storage/Legacy Agents/legacy-team-architect.py` (existing 18K Python file; cite the rubric source line range in repo_report.py docstring; do not duplicate logic — import from it OR copy-with-attribution)
   - `go_to_market_timeline` — `(7 - passed_gates) × 1 month` default
   - `business_model`, `target_users` — read from `FLOYD.md` "Project-Specific Context" section if present, else "Unknown"
   - `technical_debt` — count of `TODO`, `FIXME`, `XXX`, `HACK` comments + lint findings (run ruff/biome/cargo-clippy where applicable, capture warning counts)
   - `scalability_needs` — read from FLOYD.md or default "low"
   - `key_features` — discovered route handlers (FastAPI/Flask/Express/Rails routes), CLI entry points
   - `risks` — open critical Issues + failed Beta-readiness gates
   - `gate_statuses` — call a per-gate checker (see Step 4 for some checkers; this step stubs them as UNKNOWN initially)
   - `last_bootstrap` — `datetime.now(tz=...).isoformat()`
   - `completion_percentage` — `passed_gates / 7 * 100` rounded to nearest int
4. Implement the 3-round critic (per `repository-report-spec.md`):
   - Round 1: re-read every field, confirm evidence command/file is still valid
   - Round 2: cross-check derived fields against each other (e.g., gate_statuses count matches completion_percentage math)
   - Round 3: confirm output JSON parses cleanly and round-trips through schema validation
5. Write CLI: `python repo_report.py <project-path> [--write] [--critic-rounds 3]`
6. Write `tests/test_repo_report.py` (pytest) — at minimum: schema round-trip, complexity_score determinism, gate_statuses default UNKNOWN
7. Run against 2 EXTERNAL governed projects (`/Volumes/Storage/floyd-harness` + `/Volumes/Storage/Floyd Docs`) — capture outputs as fixture/example files. Avoid self-bootstrapping (running against `Legacy Agents` itself or `control-center` itself) for the initial fixtures — that creates a chicken-and-egg dependency since these are the projects being built. Self-bootstrap is fine in Step 8 as part of the validation milestone, after the populator is proven against external projects.
8. Commit

**Files touched:**
- MODIFIED: `repository_report_template.md` (expand to full schema)
- NEW: `control-center/scripts/repo_report.py`
- NEW: `control-center/tests/test_repo_report.py`
- NEW: `control-center/scripts/fixtures/repo_report_legacy_agents.json`
- NEW: `control-center/scripts/fixtures/repo_report_control_center.json`

**Verification:**
```bash
cd "/Volumes/Storage/Legacy Agents/control-center"
.venv/bin/python -m pytest tests/test_repo_report.py -v
.venv/bin/python scripts/repo_report.py "/Volumes/Storage/Legacy Agents" --critic-rounds 3 --write
jq -r '.completion_percentage' "/Volumes/Storage/Legacy Agents/SSOT/repository_report.json"
.venv/bin/python -c "import json,sys; r=json.load(open('/Volumes/Storage/Legacy Agents/SSOT/repository_report.json')); req=['project_name','completion_percentage','tech_stack','complexity_score','team_size_minimum','go_to_market_timeline','business_model','technical_debt','scalability_needs','target_users','key_features','risks','gate_statuses','last_bootstrap']; missing=[k for k in req if k not in r]; print('OK' if not missing else 'MISSING: '+str(missing))"
```

**Rollback:** `git revert HEAD`. The repo_report.json files written during this step can be regenerated.

**Exit criteria:** All 13 fields populate from at least one source. 3-round critic passes. pytest green. Two example reports exist.

**Model tier:** **strongest** (Opus) — schema design has cascading effects on Steps 4, 5, 7, 11

**Depends on:** Step 1

---

## Step 4 — Page 1 Governance Dashboard (replaces DeepSeek prototype)

**Objective:** First user-facing page. Lists every project across `/Volumes/SanDisk1Tb/` and `/Volumes/Storage/`, shows each project's `repository_report.json` data as a card, sorts by `completion_percentage` descending, and displays a persistent quarantine alert whenever any project has items in `.floyd/quarantine/`.

**Context brief (cold-start):**
- TCC's existing `index.html` is the chassis. Adding a new "Governance" view alongside the existing terminal grid (route segment or top-nav tab).
- New backend endpoint: `GET /api/projects`. Walks both drives, finds directories that have `FLOYD.md` at root, reads each project's `SSOT/repository_report.json` if present.
- Status badges: GOVERNED (green ✓), CANDIDATE (yellow ◐), DRIFTED (orange ⚠), UNASSESSED (gray ?). Each status has a glyph alongside the color so it's accessible.
- Card click expands to show the full report content. `file://` links to FLOYD.md, SSOT, repository_report.json, project root.
- Quarantine alert: separate `GET /api/quarantine-summary` endpoint that scans every project's `.floyd/quarantine/<date>/` and returns `{total, by_project: [{name, count, oldest_date, link}]}`. Alert renders at the top of Page 1, persistent (no auto-dismiss), color + glyph coded.
- "Dispatch Bootstrap" / "Dispatch Finisher" buttons appear per card — wired in Steps 7 and 11. For now, render them as disabled placeholders.
- Light theme polish: deliberate whitespace, semantic color, no busy gradients. The DeepSeek prototype that this replaces was dark, garish, and broken.

**Tasks:**
1. Add `GET /api/projects` endpoint to `server.py`:
   - At server startup: read `/Volumes/SanDisk1Tb/.supercache/VERSION` once → `CANONICAL_VERSION` (cached in module scope)
   - Endpoint walks `/Volumes/SanDisk1Tb/` and `/Volumes/Storage/` at depth=2 only (so `<drive>/<project>/` and `<drive>/<group>/<project>/`, no deeper)
   - Hard exclusion list (skip walking into): `.Spotlight-V100`, `.fseventsd`, `.Trashes`, `.DocumentRevisions-V100`, `.TemporaryItems`, `node_modules`, `.venv`, `venv`, `.git`, `.supercache`, `.pnpm-store`, `__pycache__`, `.pytest_cache`
   - Hard exclusion (DO NOT WALK): `/Volumes/T7/` per CLAUDE.md (Time Machine target — off limits)
   - For each candidate directory, check for `FLOYD.md` at its root
   - If present, read `SSOT/repository_report.json` (None if missing)
   - Determine status:
     - `GOVERNED` if report exists AND `last_bootstrap` < 7 days old
     - `CANDIDATE` if FLOYD.md present but no report, or report > 7 days stale
     - `DRIFTED` if `.floyd/.supercache_version` exists AND ≠ `CANONICAL_VERSION`
     - `UNASSESSED` if no FLOYD.md
   - Return JSON array, ordered by `completion_percentage` descending then `last_bootstrap` ascending (per ROADMAP.md §12.5 tiebreak)
   - Performance: cache the walk results for 30 seconds (TTL); the dashboard re-fetch interval should match
2. Add `GET /api/quarantine-summary` endpoint:
   - Walks the same projects
   - Counts items in `.floyd/quarantine/<date>/` directories (excluding WHY.md and LEDGER.jsonl)
   - Returns `{total, oldest_date, by_project: [...]}`
3. Frontend: Add a "Governance" view alongside the existing terminal view (top-nav tab or route)
4. Render project cards: status badge + name + completion_% + tech_stack + last_bootstrap + expand toggle
5. Render quarantine alert at top of Page 1, persistent until alert source is empty
6. Render `Dispatch Bootstrap` / `Dispatch Finisher` buttons per card (disabled for now)
7. "Export to Markdown" button — generates a snapshot of the full board state
8. Polish: light theme, intentional whitespace, status-by-glyph-and-color
9. pytest tests for both endpoints (use temp directories with synthetic FLOYD.md / repository_report.json fixtures)
10. Manual smoke: run the server, open `http://localhost:10527/`, verify the Governance view renders, project cards expand, quarantine alert visible if any quarantine entries exist
11. Commit

**Files touched:**
- MODIFIED: `control-center/server.py` (2 new endpoints, ~150 lines added)
- MODIFIED: `control-center/index.html` (new view, ~300 lines added including CSS)
- NEW: `control-center/static/governance-dashboard.js` (extracted module if `index.html` gets >1500 lines)
- NEW: `control-center/tests/test_projects_endpoint.py`
- NEW: `control-center/tests/test_quarantine_summary.py`
- NEW: `control-center/tests/fixtures/synthetic_projects/` (test data)

**Verification:**
```bash
cd "/Volumes/Storage/Legacy Agents/control-center"
.venv/bin/python -m pytest tests/test_projects_endpoint.py tests/test_quarantine_summary.py -v
.venv/bin/python server.py &
SERVER_PID=$!
sleep 2
curl -s http://localhost:10527/api/projects | jq -r 'length'   # expect: ≥1
curl -s http://localhost:10527/api/quarantine-summary | jq '.total'   # expect: integer ≥0
kill $SERVER_PID
# Manual: open http://localhost:10527/, click "Governance" tab, verify cards render, click a card to expand
```

**Rollback:** `git revert HEAD`. Endpoints and view both come from the same commit.

**Exit criteria:** Both endpoints return well-formed JSON. Governance view renders project cards with proper status badges. Quarantine alert visible. All tests pass.

**Model tier:** default (clear schema from Step 3, mostly UI plumbing)

**Depends on:** Step 3

---

## Step 5 — Page 2 Six-Project Workspace (PARALLEL — can run alongside Step 6)

**Objective:** Workspace page that auto-populates with the 6 highest-completion-% but not-DONE projects, each rendered as an `xterm.js` terminal pane already cd'd into the project directory.

**Context brief (cold-start):**
- TCC already has the multi-terminal grid + WebSocket PTY plumbing. This page leverages that.
- Auto-population: rank every project by `completion_percentage` descending; tiebreak by oldest `last_bootstrap` (per `ROADMAP.md §12.5`).
- Skip projects where `completion_percentage == 100` (they're DONE — no need to occupy a pane).
- Each pane: existing TCC agent shape with `directory` set to the project root, `command` defaulting to `bash` or the project's preferred shell (read from FLOYD.md if specified).
- Drag-and-drop reorder + restart-per-pane + scrollback search per pane: TCC already has these. The new code is just the auto-population logic and the route to the new view.
- Refresh trigger: re-rank on dashboard load + after every dispatch event. Don't poll continuously.

**Tasks:**
1. Add `GET /api/projects/top-six-active` endpoint that returns the ranking
2. Add Workspace view to `index.html` (route or tab)
3. On Workspace mount, fetch the ranking, create 6 ephemeral TCC agents (not persisted to `agents.json` — these are session-scoped), bind each to its pane
4. Wire the "refresh ranking" button (re-fetch + recreate panes)
5. Tests: ranking determinism with synthetic reports, tiebreak correctness
6. Manual smoke: 6 panes spawn, each cd'd into the right project, terminals interactive
7. Commit

**Files touched:**
- MODIFIED: `control-center/server.py` (1 new endpoint)
- MODIFIED: `control-center/index.html` (Workspace view)
- NEW: `control-center/tests/test_top_six_ranking.py`

**Verification:**
```bash
cd "/Volumes/Storage/Legacy Agents/control-center"
.venv/bin/python -m pytest tests/test_top_six_ranking.py -v
.venv/bin/python server.py &
SERVER_PID=$!
sleep 2
curl -s http://localhost:10527/api/projects/top-six-active | jq 'length'   # expect: ≤6
kill $SERVER_PID
# Manual: open Workspace tab, verify 6 (or fewer) panes spawn with correct directories
```

**Rollback:** `git revert HEAD`.

**Exit criteria:** Endpoint ranks correctly. Workspace view renders. Panes are interactive.

**Model tier:** default

**Depends on:** Step 4 (uses the same project-discovery scaffolding)

**Parallelizable with:** Step 6, Step 9, Step 10

---

## Step 6 — Page 3 Large Terminal Surface — full sidepanel port (PARALLEL — can run alongside Step 5)

**Objective:** Port the **actual** Floyd TTY Bridge sidepanel UI into the ControlBoard as Page 3, replacing the Chrome extension's native-messaging stack with TCC's existing FastAPI WebSocket PTY backend. The result is a dark-themed dual-terminal split-screen view (single/dual/triple toggle) that runs LIVE inside the ControlBoard, with full xterm.js capabilities (WebGL/Canvas/SearchAddon/Unicode11/FitAddon) and TCC's session lifecycle.

**Scope expansion note (2026-04-30):** Original Step 6 was "visual concept only". Douglas's 2026-04-30 surfacing clarified that this needs to be a real, running sidepanel — UI ported, backend rewired. Step 6 now includes the JS port + backend wiring, not just CSS layouts.

**Context brief (cold-start):**
- Source: `/Volumes/Storage/Floyd TTY Bridge for Chrome/extension/`
  - `sidepanel.html` (472 lines) — UI markup with status bar, dual-terminal split, command bar
  - `sidepanel.js` (read-only ref) — xterm.js TerminalSession class, addon loading (Fit, WebGL, Canvas, Search, Unicode11), Live API integration via `live-service.js`
  - `manifest.json` — Chrome extension config (irrelevant to the port)
  - `native_host.py`, `background.js`, `content-script.js` — Chrome native messaging stack (DO NOT PORT — replaced by TCC's WebSocket PTY)
- Target: a new "Terminal Surface" view in `control-center/index.html` (or a separate `control-center/static/sidepanel-view.html` served at `/sidepanel`), with vendored xterm + addons under `control-center/static/sidepanel/`.
- Backend: TCC already exposes WebSocket terminal sessions per agent. Sidepanel terminals become ephemeral TCC agents (session-scoped, not persisted to `agents.json`) bound to xterm.js panes via the existing WebSocket PTY plumbing.
- Toggle: single / dual / triple full-height terminals. Scrollback preserved on toggle (TCC frames already do this).
- Theme: keep the sidepanel's original cyberpunk dark theme on this view (acceptable exception to the light-default rule — this is a tools view, not the dashboard).
- Live API integration (`live-service.js`): out of scope for v1; document as a follow-up issue.

**Tasks:**
1. Inventory source files: `sidepanel.html`, `sidepanel.js`, `lib/xterm.css`, any addon JS used. Note the WebGL/Canvas/Search/Unicode11/Fit addons.
2. Vendor xterm + addons into `control-center/static/sidepanel/` (skip the node_modules path; pin a specific xterm version in `requirements`-equivalent for frontend, e.g., `package.json` if added)
3. Port the markup: take `sidepanel.html`, strip Chrome-extension references, keep status bar + dual-terminal grid + command bar
4. Port `TerminalSession` class from `sidepanel.js`: keep the xterm setup + addon loading; **replace** the native-messaging send/receive layer with WebSocket calls to TCC's existing `/ws/{agent_id}` endpoint
5. Add `POST /api/sidepanel/spawn` endpoint that creates an ephemeral TCC agent (auto-deleted on disconnect): `name = "sidepanel-<uuid-short>"`, `directory = $HOME` by default, `command = bash` (or shell from FLOYD.md if available)
6. Add `DELETE /api/sidepanel/{agent_id}` endpoint that stops + deletes the ephemeral agent
7. Add layout toggle (single/dual/triple) with scrollback preservation
8. Tests: ephemeral agent lifecycle, WebSocket attach/detach, layout toggle preserves scrollback (Playwright)
9. Manual smoke: open Terminal Surface view, spawn dual session, type into both panes, toggle to triple, type into the new pane, toggle back to dual, verify both original sessions still alive with full scrollback
10. Commit

**Files touched:**
- NEW: `control-center/static/sidepanel/sidepanel.html` (ported markup)
- NEW: `control-center/static/sidepanel/sidepanel.js` (ported JS, native-messaging replaced with WebSocket)
- NEW: `control-center/static/sidepanel/xterm/` (vendored xterm + addons)
- MODIFIED: `control-center/server.py` (2 new endpoints, ~80 lines)
- MODIFIED: `control-center/index.html` (top-nav tab to Terminal Surface view)
- NEW: `control-center/tests/test_sidepanel_lifecycle.py` (pytest)
- NEW: `control-center/tests/test_sidepanel_layouts.py` (Playwright E2E)
- POSSIBLE NEW: `control-center/package.json` if vendoring xterm via npm

**Verification:**
```bash
cd "/Volumes/Storage/Legacy Agents/control-center"
.venv/bin/python -m pytest tests/test_sidepanel_lifecycle.py -v
.venv/bin/python -m pytest tests/test_sidepanel_layouts.py -v
.venv/bin/python server.py &
SERVER_PID=$!
sleep 2
curl -s -X POST http://localhost:10527/api/sidepanel/spawn | jq -r '.agent_id'
# Manual: open Terminal Surface tab; verify dual full-height terminals; type bash commands in each; toggle to triple; verify
```

**Rollback:** `git revert HEAD`. Vendored xterm files removed; ephemeral agents auto-cleanup on server restart.

**Exit criteria:** Sidepanel UI ported. WebSocket PTY wired. Single/dual/triple toggle works. Scrollback preserved. Tests pass.

**Model tier:** default (mostly mechanical port + endpoint wiring; xterm patterns are well-known)

**Depends on:** Step 1 (port migration; no dependency on Steps 3 or 4)

**Parallelizable with:** Step 5, Step 9, Step 10, Step 12 (System Health), Step 13 (Infrastructure)

**Open follow-up issue (Step 6+1):** Port `live-service.js` (Gemini Live audio integration) — defer to its own step after v1 ships

---

## Step 7 — Bootstrap Worker prompt + Dispatch Bootstrap button + `/api/dispatch/bootstrap`

**Objective:** Author the Bootstrap Worker prompt (the canonical worker that runs routine A→F on a single project) and wire the "Dispatch Bootstrap" button on Page 1 so clicking it spawns a TCC agent running the worker against that project.

**Context brief (cold-start):**
- The Bootstrap Worker is one of the 9 roster workers from `ROADMAP.md §6` (Code-Only Repo Cartographer, but specialized to the bootstrap routine). Its prompt is the literal text the dispatched agent receives.
- Worker prompt structure: ROLE / SCOPE / ALLOWED ACTIONS / FORBIDDEN ACTIONS / TASK PACKET (which is "run routine A→F per repo-sanitation.md §7") / DELIVERABLES (`SSOT/repository_report.json` + `.floyd/agent_log.jsonl` entry) / EVIDENCE REQUIREMENTS / VERIFICATION RECEIPTS.
- Dispatch endpoint: `POST /api/dispatch/bootstrap` with body `{project_path: str}`. Creates a transient TCC agent.
- **Dispatch command spec — decide at Step 7 implementation time:**
  - **Option A (preferred — non-interactive):** `claude --print "$(cat <project>/.floyd/bootstrap-worker-prompt.md)" --output-format stream-json --max-turns 200 > <project>/.floyd/bootstrap-output.jsonl` — runs autonomously, writes structured output, exits cleanly. Requires `claude` CLI on PATH.
  - **Option B (fallback — interactive):** TCC opens a regular shell in the project directory; agent prompt printed at startup, Douglas pastes into Claude Code. Manual but always works.
  - **Option C (Floyd CLI):** `floyd-complex --prompt-file <prompt-md>` if Douglas's Floyd CLI supports prompt-file mode at that point.
  - Decision lives in `<project>/.floyd/bootstrap-dispatch-config.json` per project so different projects can use different harnesses.
- The endpoint stages the worker prompt as a file inside the target project's `.floyd/` so the dispatched agent can read it locally.
- v1.6.1 enforcement: the dispatched agent is bound by the no-delete-guard hook — it cannot `rm` anything. Quarantine via `floyd-quarantine` is its only removal path.
- Logging: dispatch event appends a line to `control-center/.floyd/dispatch-log.jsonl`.

**Tasks:**
1. Author `control-center/docs/bootstrap-worker.md` — the canonical worker prompt
2. Add `POST /api/dispatch/bootstrap` endpoint to `server.py`:
   - Validate `project_path` exists and contains `FLOYD.md`
   - Stage worker prompt as `<project>/.floyd/bootstrap-worker-prompt.md`
   - Create a new TCC agent: `name = "bootstrap-<project-basename>"`, `directory = <project-path>`, `command` invokes Claude Code (or the user's preferred Floyd harness) reading the prompt
   - Append to `dispatch-log.jsonl`
   - Return `{agent_id, agent_name, dispatched_at}`
3. Wire the "Dispatch Bootstrap" button on the Governance Dashboard (Step 4): enabled when project status is CANDIDATE or UNASSESSED, disabled otherwise; clicks call the endpoint
4. After dispatch: button shows "In progress…", polls `/api/agents/{id}/status` for completion, then triggers a `/api/projects` re-fetch to refresh the card
5. Tests: endpoint validation, agent creation, dispatch-log append
6. Manual smoke: pick a CANDIDATE project, click Dispatch Bootstrap, verify a new agent appears in the TCC sidebar and the worker prompt file lands at the project's `.floyd/`
7. Commit

**Files touched:**
- NEW: `control-center/docs/bootstrap-worker.md`
- MODIFIED: `control-center/server.py` (1 new endpoint, ~80 lines)
- MODIFIED: `control-center/index.html` (button wiring)
- NEW: `control-center/tests/test_dispatch_bootstrap.py`
- NEW (per dispatch): `<target-project>/.floyd/bootstrap-worker-prompt.md`
- NEW (per dispatch): `control-center/.floyd/dispatch-log.jsonl` (append-only)

**Verification:**
```bash
cd "/Volumes/Storage/Legacy Agents/control-center"
.venv/bin/python -m pytest tests/test_dispatch_bootstrap.py -v
.venv/bin/python server.py &
SERVER_PID=$!
sleep 2
curl -s -X POST -H 'Content-Type: application/json' -d '{"project_path":"/Volumes/Storage/Legacy Agents"}' http://localhost:10527/api/dispatch/bootstrap | jq .
kill $SERVER_PID
test -f "/Volumes/Storage/Legacy Agents/.floyd/bootstrap-worker-prompt.md" && echo OK
wc -l "/Volumes/Storage/Legacy Agents/control-center/.floyd/dispatch-log.jsonl"   # ≥1
```

**Rollback:** `git revert HEAD`.

**Exit criteria:** Endpoint dispatches successfully. Worker prompt staged at project. Button enables/disables correctly per status. Tests pass.

**Model tier:** **strongest** (Opus) — dispatch design cascades into Step 11

**Depends on:** Steps 3, 4, and v1.6.1 applied (no-delete-guard active so dispatched agents are governed)

---

## Step 8 — First batch of CANDIDATE projects bootstrapped end-to-end (validation milestone)

**Objective:** Run the dispatcher against 3-5 CANDIDATE projects on the drive. Each must produce a valid `repository_report.json`, get reflected on the dashboard, and quarantine any cleanup-trigger findings without violating the no-delete rule. This is the integration test that proves the whole chain works.

**Context brief (cold-start):**
- Pick 3-5 projects with FLOYD.md but no `repository_report.json` yet. Candidates from the Legacy Agents SSOT inventory: `Floyd Docs`, `Floyd_OpenFloyd`, `harness-launcher`, `LegacySiteTest`, `floyd-harness`.
- For each, click "Dispatch Bootstrap" on Page 1 → verify a TCC agent spawns → wait for its terminal to show completion → verify `SSOT/repository_report.json` exists and parses → verify the dashboard card transitions from CANDIDATE to GOVERNED.
- If any dispatched agent attempts a `rm` or other deletion command, the no-delete-guard hook blocks it (exit 2). This is the live test of v1.6.1 enforcement.
- Each project's `.floyd/agent_log.jsonl` should have a fresh signed entry.
- Each project's quarantine folder may have new entries — those should appear in the ControlBoard's quarantine alert.

**Tasks:**
1. Pick 5 candidate projects (use the Legacy Agents SSOT inventory)
2. For each, click Dispatch Bootstrap; record the agent_id and start time
3. Wait for completion with a hard timeout: 30 minutes per project. If a dispatched agent has not produced `repository_report.json` within 30 min, abort it via TCC's stop button, capture the scrollback to `Issues/<NNNN>-bootstrap-timeout-<project>.md`, mark the project DRIFTED, and move on.
4. For each completed agent, verify it produced `<project>/SSOT/repository_report.json` (parse + spot-check fields). If parse fails, dispatched agent gets re-run with explicit feedback.
5. Verify the Governance Dashboard refreshes and the card transitions to GOVERNED
6. If any project added to quarantine: verify the alert at the top of Page 1 reflects the new count
7. Spot-check: did any dispatched agent trigger the no-delete-guard? Inspect:
   - The dispatched agent's scrollback for "[no-delete-guard v1.6.1] BLOCKED" messages
   - Each project's `.floyd/agent_log.jsonl` for any session note about blocked operations
   - There should be zero blocks; one or more blocks means the dispatched agent attempted deletion (a v1.6.0 violation worth investigating)
8. Author `Issues/<NNNN>-bootstrap-batch-1-findings.md` capturing any non-blocking findings (e.g., "Project X has 47 cleanup-trigger findings, all quarantined; review recommended"; "Project Y bootstrap timed out at 30 min, scrollback at <path>")
9. Append to SSOT change log

**Files touched:**
- MULTIPLE NEW: `<each project>/SSOT/repository_report.json`
- MULTIPLE NEW: `<each project>/.floyd/agent_log.jsonl` entries
- POSSIBLE NEW: `<each project>/.floyd/quarantine/<date>/...` items
- NEW: `Issues/<NNNN>-bootstrap-batch-1-findings.md`

**Verification:**
```bash
for p in "/Volumes/Storage/Floyd Docs" "/Volumes/Storage/Floyd_OpenFloyd" "/Volumes/Storage/harness-launcher" "/Volumes/Storage/LegacySiteTest" "/Volumes/Storage/floyd-harness"; do
  echo "=== $p ==="
  test -f "$p/SSOT/repository_report.json" && echo "report: present" && jq -r '.completion_percentage' "$p/SSOT/repository_report.json"
done
curl -s http://localhost:10527/api/quarantine-summary | jq .   # verify aggregate
```

**Rollback:** N/A — this is a verification step. The repository_report.json files written are the expected artifact; if a project's bootstrap went wrong, re-dispatch with a corrected worker prompt.

**Exit criteria:** All 5 projects have valid repository_report.json. None of the dispatched agents triggered the no-delete-guard. Dashboard reflects each project's new status. Findings issue authored.

**Model tier:** default (this is verification, not new code)

**Depends on:** Step 7

---

## Step 9 — Page 4 MWIDE embed + port claim (PARALLEL)

**Objective:** Claim port 10602 for MWIDE, fix the unfilled `{{PORT}}` placeholder in MWIDE's FLOYD.md, embed MWIDE in an iframe on a new "MWIDE" tab of the ControlBoard.

**Context brief (cold-start):**
- MWIDE source lives at `/Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE/`. Its `server.ts:26` defaults PORT to 10001, which collides with `legacy-ai-delivery-architecture-package-next-portal` per the port registry. `ROADMAP.md §12.3` proposed port 10602 as the new claim.
- MWIDE's `FLOYD.md` has unfilled `{{PORT}}` template placeholder — needs replacement.
- The ControlBoard renders MWIDE in an iframe on a "MWIDE" tab. No deep integration; just a hosted view with the right URL.
- Auth: matches MWIDE's own posture (single-user localhost). The iframe is same-origin from the user's POV.

**Tasks:**
1. Claim port 10602 in `/Volumes/SanDisk1Tb/SSOT/port-registry.json` (Douglas-run write; agent stages diff)
2. Update `/Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE/server.ts:26` default to 10602
3. Update MWIDE's `FLOYD.md` — replace `{{PORT}}` with `10602`
4. Add MWIDE tab to `control-center/index.html`
5. Render iframe with `src="http://localhost:10602/"` (start MWIDE separately or document the start command)
6. Iframe sandbox attributes (allow-scripts, allow-same-origin to support MWIDE's WebSocket plumbing)
7. Tests: smoke test the iframe element renders with the right src
8. Manual: start MWIDE, open ControlBoard MWIDE tab, verify embed

**Files touched:**
- MODIFIED: `/Volumes/SanDisk1Tb/SSOT/port-registry.json` (Douglas-run)
- MODIFIED: `/Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE/server.ts`
- MODIFIED: `/Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE/FLOYD.md`
- MODIFIED: `control-center/index.html`

**Verification:**
```bash
jq -r '. | to_entries[] | select(.value=="10602")' /Volumes/SanDisk1Tb/SSOT/port-registry.json
grep "10602" /Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE/server.ts
grep -c "{{PORT}}" /Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE/FLOYD.md   # expect: 0
# Manual: start MWIDE; open ControlBoard MWIDE tab; verify iframe renders
```

**Rollback:** `git revert HEAD`. Port-registry diff revert is a separate Douglas action.

**Exit criteria:** Port claimed. PORT placeholder fixed. MWIDE iframe renders.

**Model tier:** default

**Depends on:** Step 1 (only)

**Parallelizable with:** Steps 5, 6, 10

---

## Step 10 — FLOYD CURSE'M launcher hot-button (PARALLEL)

**Objective:** Sticky button on the ControlBoard that one-click launches `/Applications/FLOYD CURSE'M.app`. No embed; just a launcher with a confirm dialog.

**Context brief (cold-start):**
- FLOYD CURSE'M.app is at `/Applications/FLOYD CURSE'M.app/`. Launching is `open -a "FLOYD CURSE'M"`.
- Button placement: top-right corner of the ControlBoard, sticky across all 4 pages.
- Confirm dialog: avoid accidental launches; show a "Launch CURSE'M for big jobs?" with explicit confirm.
- Backend: `POST /api/launch-cursem` runs `subprocess.run(["open", "-a", "FLOYD CURSE'M"])`. Return launch status.

**Tasks:**
1. Add `POST /api/launch-cursem` endpoint to `server.py`
2. Add sticky button to `index.html`
3. Add confirm dialog
4. Tests: endpoint behavior with a mocked subprocess call
5. Manual: click button, confirm, verify CURSE'M.app launches
6. Commit

**Files touched:**
- MODIFIED: `control-center/server.py` (1 new endpoint, ~30 lines)
- MODIFIED: `control-center/index.html` (button + confirm dialog)
- NEW: `control-center/tests/test_launch_cursem.py`

**Verification:**
```bash
cd "/Volumes/Storage/Legacy Agents/control-center"
.venv/bin/python -m pytest tests/test_launch_cursem.py -v
# Manual: click sticky button > confirm > FLOYD CURSE'M.app opens
```

**Rollback:** `git revert HEAD`.

**Exit criteria:** Button visible on every page. Confirm dialog works. CURSE'M.app launches on confirm.

**Model tier:** default

**Depends on:** Step 1 (only)

**Parallelizable with:** Steps 5, 6, 9

---

## Step 11 — Dispatch Finisher button + Team Floyd Orchestrator integration

**Objective:** "Dispatch Finisher" button on Page 1 (enabled for GOVERNED + report-verified projects) that spawns a TCC agent running the **full Team Floyd Orchestrator prompt** (`ROADMAP.md Appendix A`), pre-loading that project's `repository_report.json` as Phase 0 Intake, and feeds back gate progress to the dashboard.

**Context brief (cold-start):**
- Team Floyd Orchestrator full prompt is in `ROADMAP.md` Appendix A — verbatim, canonical.
- The orchestrator drives a project from current state to BETA-READY via deterministic worker packets. It plans, doesn't implement. Each cycle emits one Task Packet + one Worker Prompt.
- Pre-load: when dispatching, the orchestrator's Phase 0 Intake auto-fills from the project's `repository_report.json` (project name, tech stack, repo location, target runtime, etc.). Beta definition primary journeys come from the report's `key_features`.
- The dispatched orchestrator agent runs in a long-lived TCC terminal. Its output (HEARTBEAT / SSOT STATUS / BETA READINESS DASHBOARD / NEXT TASK PACKET / WORKER PROMPT) appears in the terminal scrollback.
- Each cycle produces a worker prompt that Douglas (or another dispatched agent in a fresh context) executes.
- Gate progress feedback: prefer a **structured-output** path over scrollback parsing.
  - **Preferred:** the orchestrator's worker prompt template includes an instruction to write its current dashboard state to `<project>/.floyd/orchestrator-state.json` after every cycle (alongside the human-readable terminal output). The ControlBoard polls that file. Schema: `{phase, packet_id, last_verified_outcome, blockers, gate_statuses: {build_run, primary_journey, automated_tests, e2e_tests, multi_min_human_sim, security, demo}, updated_at}`.
  - **Fallback:** scrollback regex parser that extracts the BETA READINESS DASHBOARD section from `GET /api/agents/{id}/scrollback`. Used when the dispatched harness doesn't honor the structured-output instruction. Brittle — parser tests must include sample scrollbacks for every roster worker style.
- The "Dispatch Finisher" button only enables when: project status = GOVERNED AND `last_bootstrap` < 7 days AND `repository_report.json` parses cleanly.

**Tasks:**
1. Author `control-center/docs/finisher-orchestrator.md` — canonical orchestrator prompt (copied verbatim from ROADMAP.md Appendix A) with a header noting "this is the engine prompt; do not edit"
2. Add `POST /api/dispatch/finisher` endpoint:
   - Validate project status is GOVERNED + report parseable
   - Stage orchestrator prompt + repository_report.json into `<project>/.floyd/finisher-prompt.md` and `<project>/.floyd/finisher-intake.json`
   - Create a new TCC agent: `name = "finisher-<project-basename>"`, `directory = <project-path>`, `command` invokes Claude Code (or preferred harness) reading the orchestrator prompt
   - Append dispatch log entry
3. Add a parser for the orchestrator's BETA READINESS DASHBOARD section: scrapes the terminal scrollback periodically (TCC already supports `GET /api/agents/{id}/scrollback`), extracts gate statuses, updates the corresponding project's card
4. Wire the "Dispatch Finisher" button on the Governance Dashboard with the enable/disable rules
5. Add a "Finisher Live" panel on the project card that shows current Phase / Packet ID / last verified outcome / current blockers (parsed from orchestrator output)
6. Tests: dispatch endpoint, scrollback parser, gate-status update flow
7. Manual smoke: pick one GOVERNED project, click Dispatch Finisher, verify orchestrator agent spawns, verify first response includes HEARTBEAT/SSOT STATUS/BETA READINESS sections, verify dashboard card reflects the gate statuses
8. Commit

**Files touched:**
- NEW: `control-center/docs/finisher-orchestrator.md`
- MODIFIED: `control-center/server.py` (1 new endpoint + scrollback parser, ~150 lines)
- MODIFIED: `control-center/index.html` (button + Finisher Live panel)
- NEW: `control-center/tests/test_dispatch_finisher.py`
- NEW: `control-center/tests/test_orchestrator_parser.py`
- NEW (per dispatch): `<target-project>/.floyd/finisher-prompt.md`
- NEW (per dispatch): `<target-project>/.floyd/finisher-intake.json`

**Verification:**
```bash
cd "/Volumes/Storage/Legacy Agents/control-center"
.venv/bin/python -m pytest tests/test_dispatch_finisher.py tests/test_orchestrator_parser.py -v
.venv/bin/python server.py &
SERVER_PID=$!
sleep 2
# Pick a GOVERNED project that completed bootstrap in Step 8:
TARGET="/Volumes/Storage/harness-launcher"
curl -s -X POST -H 'Content-Type: application/json' -d "{\"project_path\":\"$TARGET\"}" http://localhost:10527/api/dispatch/finisher | jq .
sleep 30   # let the orchestrator emit its first response
curl -s http://localhost:10527/api/projects | jq ".[] | select(.path==\"$TARGET\") | .gate_statuses"
kill $SERVER_PID
```

**Rollback:** `git revert HEAD`.

**Exit criteria:** Endpoint dispatches finisher cleanly. First orchestrator response parses correctly. Gate statuses appear on the dashboard card. Tests pass.

**Model tier:** **strongest** (Opus) — orchestrator integration has the most cascading complexity in the plan

**Depends on:** Steps 4, 7, 8 (need at least one project with a verified report from Step 8 to test against)

---

---

## Step 12 — Page 5: Mac System Health (cleanup report LIVE) — PARALLEL

**Objective:** Add a "System Health" page to the ControlBoard that runs the Mac cleanup scan LIVE — disk-space recoverable from rarely-used apps + memory pressure from heavy processes — and renders the result with the same dark-themed layout as the prior one-shot HTML report. The page auto-refreshes the data periodically; the user can also trigger an on-demand re-scan.

**Context brief (cold-start):**
- Source one-shot report (read-only, for visual reference + recommended sections):
  `/Users/douglastalley/Library/Application Support/Claude/local-agent-mode-sessions/2e47ec60-1710-48c1-9ba7-a1c2f7c6f7a4/2f8223c9-7dfa-4f78-b1ed-16a30c7b4da5/local_fadc35f0-cdc6-411a-904f-4e892c1cc0a1/outputs/mac-cleanup-report.html` (524 lines — stats grid + sortable table + recommendations cards)
- The original report was generated by a one-shot Claude Code scan; this step re-implements the scan deterministically as `control-center/scripts/system_scan.py` so the data is reproducible and refreshable.
- Scan inputs (per the original session prompt captured in `audit.jsonl`):
  - `/Applications/*.app` and `~/Applications/*.app` — bundle sizes (`du -sh`), last-used dates (`mdls -name kMDItemLastUsedDate`), recommendations
  - Memory: `ps -axco pid,rss,pcpu,comm` sorted by RSS — top processes + helpers
  - Special focus on user-flagged hogs: Chrome, OpenCode, Notion, Floyd helpers (`superfloyd_*`, `floyd-lab-server`, `floyd4`)
  - Disk recovery candidates: apps not used in 90+ days, sorted by size descending
- The page renders in the cleanup report's dark style (deliberate exception to the light-default rule — this is a dense data view, dark works better).
- Auto-refresh cadence: every 5 minutes; manual "Re-scan now" button triggers immediate refresh.
- Caching: scan output cached in `control-center/.floyd/system-health-cache.json`; the page reads from cache; the scan script writes to cache.

**Tasks:**
1. Author `control-center/scripts/system_scan.py` (Python, type-annotated):
   - `scan_apps()` → list of `{name, path, size_mb, last_used_iso, days_idle, recommendation}` — `recommendation` ∈ {`keep`, `consider`, `remove`}
   - `scan_memory()` → list of `{process_name, pid_count, rss_gb, pct_total, classification}` — `classification` ∈ {`system`, `keep`, `consider`, `tame`}
   - `scan_disk_recovery_candidates()` → top-N apps idle >90 days sorted by size descending
   - Output: writes JSON to `control-center/.floyd/system-health-cache.json` with timestamp
2. Add `GET /api/system-health` to `server.py` — returns cached JSON (or triggers scan if cache > 5 min old)
3. Add `POST /api/system-health/rescan` — synchronous re-scan (bounded to 30s); returns fresh JSON
4. Add System Health view in `control-center/index.html` (or a separate `static/system-health.html` served at `/system-health`) — uses the cleanup report's CSS tokens + structure
5. Render: stats cards (total recoverable disk GB, current memory free, top hog, idle app count) + sortable apps table + memory hogs table + recommendations cards
6. Wire: page polls `/api/system-health` every 5 min; "Re-scan" button hits `/api/system-health/rescan`
7. Tests: `scripts/system_scan.py` unit tests on synthetic /Applications fixture; endpoint tests
8. Manual smoke: open System Health page; verify stats match `du -sh /Applications/*.app | sort -h | tail -10` and `ps aux | sort -k4 -nr | head` order
9. Commit

**Files touched:**
- NEW: `control-center/scripts/system_scan.py`
- NEW: `control-center/static/system-health.html` (or block in `index.html`)
- MODIFIED: `control-center/server.py` (2 new endpoints)
- MODIFIED: `control-center/index.html` (top-nav tab)
- NEW: `control-center/tests/test_system_scan.py`
- NEW: `control-center/tests/test_system_health_endpoint.py`
- NEW (per scan): `control-center/.floyd/system-health-cache.json`

**Verification:**
```bash
cd "/Volumes/Storage/Legacy Agents/control-center"
.venv/bin/python -m pytest tests/test_system_scan.py tests/test_system_health_endpoint.py -v
.venv/bin/python scripts/system_scan.py
jq -r '.apps | length' .floyd/system-health-cache.json
.venv/bin/python server.py &
SERVER_PID=$!
sleep 2
curl -s http://localhost:10527/api/system-health | jq -r '.scanned_at, (.apps | length), (.memory_hogs | length)'
```

**Rollback:** `git revert HEAD`.

**Exit criteria:** Scan runs cleanly. Endpoint serves data. Page renders. Re-scan button works.

**Model tier:** default

**Depends on:** Step 1 (only)

**Parallelizable with:** Steps 5, 6, 9, 10, 13

---

## Step 13 — Page 6: Infrastructure Cartography (embed) — PARALLEL

**Objective:** Add an "Infrastructure" page to the ControlBoard that displays the existing Legacy AI infrastructure map at `~/Downloads/Legacy_AI_Delivery_Architecture_Package/network-map/infrastructure-map.html`. The map covers IONOS, Vercel, Hostinger, Railway, Supabase, DigitalOcean, GCP, GitHub, and the local AI stack. Static content; no live backend in v1.

**Context brief (cold-start):**
- Source: `/Users/douglastalley/Downloads/Legacy_AI_Delivery_Architecture_Package/network-map/infrastructure-map.html` (1451 lines)
- Embeds CSS via Google Fonts CDN (IBM Plex Mono/Sans, Fraunces); cartographic dark theme with color-coded provider sections
- Multi-tab nav at the top of the page (sticky)
- Static hardcoded provider cards — no backend, no fetch
- Decision: copy the file into `control-center/static/infrastructure-map.html` (vendored, version-pinned to today's content) and embed via iframe on the ControlBoard page. If the source updates, run a refresh script to re-vendor.

**Tasks:**
1. Copy `infrastructure-map.html` into `control-center/static/infrastructure-map.html`
2. Audit copied file for any local file refs (relative paths, absolute paths to Downloads/) — fix any that would break inside the static folder
3. Add `GET /infrastructure-map.html` route (FastAPI's StaticFiles already serves from `static/`)
4. Add Infrastructure top-nav tab in `index.html` — renders an iframe with `src="/infrastructure-map.html"`, full container height
5. Author `scripts/refresh-infrastructure-map.sh` (one-liner: `cp <source> static/infrastructure-map.html`) for future re-vendor
6. Document in `docs/infrastructure-map.md`: source location, how to refresh, version pinning policy
7. Tests: smoke test the iframe element renders + `/infrastructure-map.html` returns 200 with the expected first 100 chars
8. Commit

**Files touched:**
- NEW (vendored): `control-center/static/infrastructure-map.html` (~1451 lines copied)
- NEW: `control-center/scripts/refresh-infrastructure-map.sh`
- NEW: `control-center/docs/infrastructure-map.md`
- MODIFIED: `control-center/index.html` (Infrastructure top-nav tab)
- NEW: `control-center/tests/test_infrastructure_map.py`

**Verification:**
```bash
cd "/Volumes/Storage/Legacy Agents/control-center"
.venv/bin/python -m pytest tests/test_infrastructure_map.py -v
.venv/bin/python server.py &
SERVER_PID=$!
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:10527/infrastructure-map.html   # expect 200
# Manual: open Infrastructure tab; verify map renders, tabs interact, no broken assets
```

**Rollback:** `git revert HEAD`.

**Exit criteria:** Map page accessible at `/infrastructure-map.html`. Top-nav tab embeds it cleanly. No broken assets.

**Model tier:** default

**Depends on:** Step 1 (only)

**Parallelizable with:** Steps 5, 6, 9, 10, 12

---

## Dependency graph

```
Step 1 ─┬─> Step 2 ─> Step 3 ─> Step 4 ─┬─> Step 5  (parallel)
        │                                ├─> Step 6  (parallel — sidepanel port + WebSocket rewire)
        │                                ├─> Step 9  (parallel — MWIDE)
        │                                ├─> Step 10 (parallel — CURSE'M launcher)
        │                                ├─> Step 12 (parallel — System Health)
        │                                ├─> Step 13 (parallel — Infrastructure embed)
        │                                └─> Step 7 ─> Step 8 ─> Step 11
        └─> v1.6.0/v1.6.1 governance bumps must apply BEFORE Step 2 starts
```

## Step status legend (for tracking)

- `[ ]` — not started
- `[~]` — in progress
- `[x]` — complete (PR merged or commit landed in direct mode)
- `[!]` — blocked (annotate with blocker)
- `[s]` — skipped (annotate with reason)

## Tracker

- [x] Step 1 — Foundation reset (commit `b50ffa8` 2026-04-30T12:13)
- [!] Step 2 — Quarantine superseded DeepSeek artifacts _(blocked: v1.6.1 INSTALL.sh not yet applied → no `floyd-quarantine` helper installed yet)_
- [ ] Step 3 — repository_report.json schema + populator (**strongest model**)
- [ ] Step 4 — Page 1 Governance Dashboard
- [ ] Step 5 — Page 2 Six-Project Workspace _(parallel-eligible)_
- [ ] Step 6 — Page 3 Large Terminal Surface — **full sidepanel port + WebSocket rewire** _(parallel-eligible)_
- [ ] Step 7 — Bootstrap Worker prompt + Dispatch Bootstrap (**strongest model**)
- [ ] Step 8 — First batch of CANDIDATE projects bootstrapped end-to-end
- [ ] Step 9 — Page 4 MWIDE embed _(parallel-eligible)_
- [ ] Step 10 — FLOYD CURSE'M launcher _(parallel-eligible)_
- [ ] Step 11 — Dispatch Finisher + Orchestrator integration (**strongest model**)
- [ ] Step 12 — Page 5: Mac System Health (cleanup report LIVE) _(parallel-eligible, added 2026-04-30)_
- [ ] Step 13 — Page 6: Infrastructure Cartography (embed) _(parallel-eligible, added 2026-04-30)_

## Plan mutation protocol

If a step needs to split, insert, skip, reorder, or abandon: append an audit entry to the **Change Log** below with timestamp + reason + the new shape. Do not silently rewrite step bodies — quarantine the prior step body to a `archive/` subsection if it had substance.

## Change Log

- 2026-04-30T11:14 — Plan generated by `/blueprint controlboard`. 11 steps. Critical path 7. Parallel side branches at Steps 5, 6, 9, 10. Three steps assigned strongest model: 3 (schema), 7 (dispatch), 11 (orchestrator).
- 2026-04-30T12:35 — Plan grew from 11 → 13 steps after Douglas surfaced three additional integration targets. Step 6 scope expanded from "visual concept only" to a full port of `Floyd TTY Bridge for Chrome/extension/sidepanel.html` with native messaging replaced by TCC's WebSocket PTY backend. Two new parallel-eligible steps added: **Step 12** (Mac System Health — live re-runnable scan + dark-themed report served at `/system-health`, derived from prior one-shot `mac-cleanup-report.html`) and **Step 13** (Infrastructure Cartography — vendored copy of `Legacy_AI_Delivery_Architecture_Package/network-map/infrastructure-map.html` embedded in the ControlBoard via iframe). Critical path unchanged at 7 steps; parallel side branches now total 6 (Steps 5, 6, 9, 10, 12, 13).
- 2026-04-30T12:13 — **Step 1 executed**. Commit `b50ffa8` lands. 55 files / 13,101 lines. git init at project root, all foundation file customization complete, venv built (Python 3.14.3 + FastAPI 0.136.1 + uvicorn 0.46.0 + pydantic 2.13.3), smoke-bind on port 10527 verified. Port-registry diff staged at `.floyd/port-claim-diff.md` for Douglas. Step 2 blocked pending v1.6.1 INSTALL.sh apply (needs `floyd-quarantine` helper).
- 2026-04-30T11:18 — Adversarial review pass (Opus). Six critical findings fixed in place:
  1. Step 1: removed inappropriate `floyd-quarantine` calls for rsync-artifact `agents.json`/`state.json` (those weren't part of project history; simple overwrite is correct). Added `make venv` + smoke-bind step.
  2. Step 3: changed test fixtures from `Legacy Agents` itself + `control-center` itself to external projects (`floyd-harness`, `Floyd Docs`) to avoid chicken-and-egg self-bootstrap. Pinned `team_size_minimum` rubric to existing `legacy-team-architect.py`.
  3. Step 4: explicit drive-walk depth=2, hard exclusion list, `/Volumes/T7/` off-limits per CLAUDE.md, canonical version cached at startup, 30s TTL on the walk results.
  4. Step 7: dispatch command spec deferred to Step-7-time decision with three explicit options (claude --print stream-json, interactive, Floyd CLI) selectable per project via `bootstrap-dispatch-config.json`.
  5. Step 8: 30-minute hard timeout per dispatched agent + abort path + no-delete-guard inspection criteria.
  6. Step 11: prefer structured-output (`.floyd/orchestrator-state.json`) over scrollback parsing; scrollback as fallback only.
