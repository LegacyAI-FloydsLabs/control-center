# Changelog

---

This is the paper trail. Every commit that mattered, in order, with the context that git logs don't give you.

The format is simple: what happened, when, and why. No version number theater. No "we're thrilled to announce." Just the record of a garage that kept shipping.

---

## [2026-05-09] — Terminal Pane Isolation

**Commit:** `f650db2`

Terminal panes were sharing input. You typed in one, characters appeared in another. This is not a feature. This is a haunting. Fixed it so each pane owns its own stdin. One terminal, one pipe. Ghosts exorcised.

---

## [2026-05-09] — Responsive Layout

**Commit:** `afd2855`

The Kernel looked great on a monitor and like a ransom note on a phone. Three breakpoints later — mobile, tablet, desktop — it works everywhere. Sidebar collapses. Content reflows. Nobody had to say "mobile-first strategy" out loud, which means we all won.

---

## [2026-05-09] — The Big Merge: Beta 1–8

**Commit:** `f9418aa` (merge), `c7daac1` (source)

Eight milestones. One commit. Here's what landed:

- **11 tabs** — the full Legacy AI stack under one roof
- **WCAG AA** — contrast checked, keyboard nav working, ARIA present
- **Theme system** — Tokyo Night dark theme with CSS custom properties
- **179 tests** — WebSocket tests, PTY lifecycle, API coverage, governance
- **Agent Execution** — ATerm source copied in, real PTY-backed terminals
- **Workspace Editor** — MWIDE source copied in, DOM injection, no iframe
- **System Map** — infrastructure cartography in Shadow DOM
- **Dev Launcher, Spend Watch, Mac Cleanup** — three standalone tools, iframe-wrapped

This is the commit where it stopped being a collection of features and started being a product.

---

## [2026-05-05] — The Unified App Plan

**Commit:** `9a982d3`

The moment the Kernel stopped being a dashboard and started being an application. Someone wrote down "what if it was just one thing" and then built the one thing. Revolutionary concept in some circles.

---

## [2026-05-04] — Workspace + Dual Terminal

**Commits:** `e249de5`, `3dd12e2`

**Six-project workspace.** Multiple projects visible at once, because humans with two monitors shouldn't need a third just to see what's running.

**Dual terminal.** Two PTY sessions side by side. Some problems are solved by adding a second terminal. Most problems, actually.

---

## [2026-05-04] — MWIDE, System Health, Infrastructure Map

**Commits:** `08b20d0`, `66a794a`, `7812941`

**Workspace editor** embedded. Not in a sad iframe — injected into the DOM where it belongs.

**Mac system health.** Live cleanup reports. The disk space truth nobody wants to hear.

**Infrastructure cartography.** A map of what's running where. Guessing is not a deployment strategy and never was.

---

## [2026-05-03] — Governance Dashboard

**Commit:** `a62f7cf`

Scan projects. Quarantine the ones that are lying. Tag everything so you can find it later. Bureaucracy, built by people who hate bureaucracy, which means it actually works.

---

## [2026-05-03] — Repository Reporter

**Commit:** `bd492e3`

Automated repository reporting. 13 tests. The machine checks itself because asking nicely doesn't scale.

---

## [2026-05-03] — The Beginning

**Commits:** `b50ffa8`, `4c35765`

Directories were created. A plan was written. The cats were unimpressed but monitored closely. Every project starts somewhere. This one started with a `mkdir` and a grudge.

---

## The Scoreboard

| Metric | Count |
|---|---|
| Tests | 195 |
| Test files | 22 |
| Python lines | 11,599 |
| Nav tabs | 11 |
| WebSocket endpoints | 4 |
| REST routes | 30+ |
| Live ATerm actions | 9 |
| Stub ATerm actions | 10 |
| Times "synergy" appeared | 0 |
| Board meetings | 0 |
| VC funding | $0 |

---

*— Floyd's Labs, Brown County, Indiana*
*"We shipped 195 passing tests and all we got was this changelog."*
