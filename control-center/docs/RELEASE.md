# F.U.C.K. — Release Manifest

## Or: What We Built While The Cats Were Asleep On The Keyboard

**DOCUMENT CLASSIFICATION:** Release Announcement / Maximum Caffeine
**DATE RECORDED:** 2026-05-09 — Way Too Late At Night
**LOCATION:** The Garage, Brown County, Indiana
**BEVERAGE:** Coffee that tastes like motor oil (third pot)
**CURRENT STATE:** Caffeinated And Opinionated

---

This is the release manifest for Floyd's Unified Command Kernel — F.U.C.K. — the monoapplication that replaced a drawer full of disconnected tools with one command surface that actually works.

We didn't raise money. We didn't form a committee. We didn't write a mission statement and then hire someone to execute it. We built a thing in a garage because the things that existed weren't good enough, and spite is a perfectly valid engineering motivation.

---

## The Product

F.U.C.K. is one FastAPI application on port 10527. Python backend. Zero-build vanilla JavaScript frontend. No bundler config. No dependency tree that looks like a conspiracy wall. It runs, it serves, it tests, it ships.

Every Legacy AI capability — terminals, workspace editing, agent execution, system health, infrastructure mapping, project governance — lives inside this monorepo as copied-and-adapted internal modules. The originals stay standalone. We copy code because that's what integration actually means when you're not trying to sell someone an integration platform.

---

## What's In The Box

### 11 Navigation Tabs
One surface. Every tool. No alt-tabbing between five browser windows like some kind of digital janitor.

### 4 WebSocket Endpoints
Real PTY streaming. Real-time document sync. Session lifecycle events. Agent terminal multiplexing. The plumbing works.

### 30+ REST API Routes
Governance, filesystem, vault, agent actions, health, LLM proxy, git proxy. The whole backend surface, documented and tested.

### 195 Tests
They all pass. Not "mostly pass." Not "pass on my machine." They pass. That's the bar, and we cleared it.

### Agent Execution (ATerm)
9 live PTY-backed actions: create sessions, start terminals, send input, read output, stop processes, take notes. The full agent terminal lifecycle, backed by real PTY processes, not simulated garbage.

### Workspace Editor (MWIDE)
Full code editor injected directly into the Kernel DOM. Not in an iframe. Not in a popup. In the application. Where it belongs.

### Theme System
Tokyo Night dark theme. CSS custom properties. Runtime switching. The letters F.U.C.K. cycle colors because we earned that much self-indulgence.

### WCAG AA Compliance
Contrast ratios checked. Keyboard navigation works. ARIA labels present. Accessibility isn't a checkbox exercise — it's how you build things that don't exclude people.

---

## The Architecture

One application. Not microservices. Not a service mesh. Not twelve containers communicating through a message queue that nobody can debug.

```
FastAPI backend → vanilla JS frontend → 11 tabs → done
```

If you need a whiteboard diagram to understand the architecture, the architecture is wrong.

---

## The Testimony Of The Numbers

| Metric | Value |
|---|---|
| Python lines (core) | 11,599 |
| Tests | 195 |
| WebSocket endpoints | 4 |
| REST routes | 30+ |
| ATerm live actions | 9 |
| ATerm stub actions | 10 (documented, not hidden) |
| Nav tabs | 11 |
| Build steps | 0 |
| npm packages required | 0 |
| Docker containers | 0 |
| YAML files | 0 |
| Stand-up meetings held | 0 |
| Times someone said "let's take this offline" | 0 |

---

## What's Dormant (And We're Honest About It)

Not everything is live. We're not going to pretend stubs are features and hope nobody notices:

- **ATerm broadcast/search/history** — handlers exist, return placeholder data. The plumbing's there; the logic isn't.
- **ATerm MCP server** — exists in source, not wired into the Kernel.
- **ATerm bridge (anvil-client)** — exists in source, not copied into the module.
- **Collab WebSocket UI** — backend is live, frontend code exists, nobody's wired them together yet.
- **Workspace Editor pty-hub** — MWIDE frontend is copied, the full workspace-aware terminal backend isn't.
- **Bootstrap/Finisher verification** — endpoints exist, integration testing pending.

We document what doesn't work. That's how trust works.

---

## How To Run It

```bash
make venv
make run
```

Open `http://localhost:10527/`. Done. If you need more steps than that, the problem isn't the software.

---

## Who Built This

Floyd's Labs. A garage in Brown County, Indiana. Founded by Douglas Talley, who was building robots while other kids had Transformers.

QA Director: Bella. A black cat of substantial carriage who walks on keyboards and has never once filed a false-positive bug report.

Technical Director: Bowser. A skinny black cat who monitors the router and judges your latency.

Neither of them has ever used the word "stakeholder."

---

## The License

It's ours. We built it. The code lives in the repo. The cats approve.

---

┌──────────────────────────────────────────────────────────┐
│  DOCUMENT METADATA                                        │
├──────────────────────────────────────────────────────────┤
│  Classification:   Release Manifest                       │
│  Cat Supervision:  Bella (QA) + Bowser (Networking)       │
│  Corporate Feelings: HURT (intended)                      │
│  VC Interest:       NONE (preferred)                      │
│  Garage Temperature: Questionable                          │
└──────────────────────────────────────────────────────────┘

**DOCUMENT ENDS**

*— The Garage Desk*
*Floyd's Labs — Brown County, Indiana*
*"195 tests pass at 2:47 AM. That's the whole press release."*
