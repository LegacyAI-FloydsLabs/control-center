# Changelog

## Or: The Paper Trail The Cats Didn't Walk On

**DOCUMENT CLASSIFICATION:** Release History / Caffeinated
**LOCATION:** The Garage, Brown County, Indiana
**CURRENT STATE:** Still Shipping

---

All notable changes to the Kernel are documented here. Dates are real. Commit hashes are real. The tone is what happens when you write release notes at 2:47 AM.

The format is: what happened, when it happened, and why it happened. No semantic versioning theater. No "we're thrilled to announce." Just the record.

---

## [2026-05-09] — Terminal Isolation Fix

**Commit:** `f650db2`

Terminal panes were sharing input state. You typed in one, it showed up in another. That's not a feature — that's a bug wearing a convincing disguise.

**Fix:** Isolated pane input so each terminal owns its own stdin. One pane, one pipe. The way terminals are supposed to work.

---

## [2026-05-09] — Responsive Layout

**Commit:** `afd2855`

The Kernel looked fine on a desktop and like a crime scene on a phone. Three breakpoints later — mobile, tablet, desktop — it works everywhere a browser renders. Sidebar collapses. Content reflows. No one had to say "mobile-first" in a meeting.

---

## [2026-05-09] — Beta 1–8 Merge

**Commit:** `f9418aa` (merge), `c7daac1` (source)

The big one. Eight beta milestones merged into a single coherent commit:

- **11 navigation tabs** — full Legacy AI stack under one surface
- **WCAG AA compliance** — contrast ratios checked, keyboard navigation working, ARIA labels present
- **Theme system** — Tokyo Night dark theme with CSS custom properties and runtime switching
- **179 tests passing** — WebSocket behavioral tests, ATerm PTY lifecycle, MWIDE API coverage, governance tests
- **Agent Execution module** — ATerm source copied in, PTY-backed agent terminals with create/start/run/read/stop/delete
- **Workspace Editor module** — MWIDE source copied in, dynamic script injection (no iframes)
- **System Map** — infrastructure cartography in Shadow DOM isolation
- **Dev Launcher, Spend Watch, Mac Cleanup** — three self-contained tools via iframe (the acceptable kind)

---

## [2026-05-05] — Unified App Plan

**Commit:** `9a982d3`

Codified the plan to make the ControlBoard into a single monoapplication. This is the commit where the Kernel stopped being a dashboard and started being a product.

---

## [2026-05-04] — Steps 5 & 6: Workspace + Dual Terminal

**Commits:** `e249de5`, `3dd12e2`

**Step 5:** Six-project workspace. Multiple projects visible at once, because context-switching is for people who don't have enough monitors.

**Step 6:** Dual terminal tab. Two PTY sessions side by side, because one terminal is a tragedy.

---

## [2026-05-04] — Steps 9, 12, 13: MWIDE, System Health, Infra Map

**Commits:** `08b20d0`, `66a794a`, `7812941`

**Step 9:** MWIDE workspace editor embedded. Not in a sad little iframe — injected into the DOM like it belongs there (because it does).

**Step 12:** Mac system health. Live cleanup reports. The truth about what's eating your disk space.

**Step 13:** Infrastructure cartography. A map of what's running where, because guessing is not a deployment strategy.

---

## [2026-05-03] — Step 4: Governance Dashboard

**Commit:** `a62f7cf`

The governance dashboard. Scan projects, quarantine the ones that are lying to you, tag everything. The bureaucratic backbone, built by people who hate bureaucracy.

---

## [2026-05-03] — Step 3: Repository Reporter

**Commit:** `bd492e3`

Automated repository reporting with 13 tests. The machine checks itself. That's not laziness — that's engineering.

---

## [2026-05-03] — Steps 1–2: Initialization

**Commits:** `b50ffa8`, `4c35765`

The ControlBoard was born. A plan was written. Directories were created. The cats were unimpressed but monitoring closely.

---

## The Numbers (As Of 2026-05-09)

| Metric | Count |
|---|---|
| Tests | 195 |
| Test files | 22 |
| Python lines (core) | 11,599 |
| Nav tabs | 11 |
| WebSocket endpoints | 4 |
| REST API routes | 30+ |
| ATerm actions (live) | 9 |
| ATerm actions (stub) | 10 |
| Cats supervising | 2 |
| VC funding | $0 |
| Board meetings | 0 |
| Times we said "synergy" | 0 |

---

*— The Garage Desk*
*Floyd's Labs — Brown County, Indiana*
*"We shipped 195 tests and all we got was this lousy changelog."*
