# The Kernel — Release Manifest

## Or: The Announcement You Didn't Ask For But Definitely Deserve

---

Somewhere in Brown County, Indiana, at a hour that would concern a doctor, a guy in a garage finished wiring seven separate applications into one command surface and decided it was ready to exist in public.

This is that thing.

Floyd's Unified Command Kernel. One FastAPI application. Python backend. Vanilla JavaScript frontend. Zero build steps. 195 tests, all green. Eleven tabs covering the full Legacy AI capability stack. No venture capital. No board of directors. No mission statement that was written by committee and approved by fear.

Just a tool that works, built by someone who was annoyed that the existing tools didn't.

---

## What's Actually In Here

**11 navigation tabs** — one surface for terminals, workspace editing, agent execution, system health, infrastructure mapping, project governance, and four other things that each deserve their own sentence but collectively add up to "you don't need six browser windows anymore."

**4 WebSocket endpoints** — real PTY streaming, real-time document sync, session lifecycle events, agent terminal multiplexing. The pipes are real. The data flows. Nothing is simulated.

**30+ REST API routes** — governance, filesystem, vault, agent actions, health, LLM proxy, git proxy. The backend surface is complete, documented, and tested.

**195 tests** — they pass. Not "on my machine." Not "with the right environment variables." They pass. This is the bar, and the bar was cleared.

**9 live ATerm actions** — create, start, run, read, stop, cancel, delete, list, note. Real PTY processes. Real sessions. Real output flowing through real WebSockets.

**A full workspace editor** — MWIDE source, copied in, injected directly into the Kernel DOM. Not an iframe. Not a popup. Part of the application.

**Tokyo Night dark theme** — because staring at a white screen at 2:47 AM is how you go from "productive" to "questioning your life choices." The title letters cycle colors because Bella walked across the keyboard during CSS review and it looked better after.

**WCAG AA compliance** — contrast ratios, keyboard navigation, ARIA labels. Accessibility isn't a feature checkbox. It's how you build things that don't exclude people. The cats approve. They'd tell you if they didn't.

---

## The Architecture In One Line

```
FastAPI → vanilla JS → 11 tabs → done
```

If you need a whiteboard to explain your architecture, the architecture is the problem.

---

## The Honest Part

Not everything is live. We're not going to pretend otherwise:

- **ATerm broadcast/search/history** — handlers exist, return placeholders. Plumbing's in. Logic isn't.
- **ATerm MCP server** — lives in source code. Not wired yet.
- **ATerm bridge** — same story. Code exists, not connected.
- **Collab WebSocket UI** — backend works, frontend code is there, nobody wired them together. The pipe works. Nobody's turned on the faucet.
- **Workspace Editor pty-hub** — frontend is fully copied. The workspace-aware terminal backend isn't.
- **Bootstrap/Finisher** — endpoints exist. Integration testing hasn't happened yet.

We document what doesn't work. Because hiding stubs behind marketing language is how you lose trust, and trust is all you have when you're building in a garage with no PR department.

---

## How To Run It

```bash
make venv
make run
```

Open `http://localhost:10527/`. If you need more than two commands to start a development tool, someone is overcomplicating your life on purpose.

---

## The Byline

Floyd's Labs. Brown County, Indiana. Founded by Douglas Talley, who was building robots while other kids had Transformers and has never recovered from the impulse.

Bella — QA Director. Substantial. Authoritative. Walks on keyboards during deploys and has an unexplained ability to break things that shouldn't be breakable.

Bowser — Technical Director. Skinny. Router-adjacent. Latency- judgmental. Understands infrastructure on a level that concerns everyone.

Neither has ever said "stakeholder." Neither has ever approved a scope change. They're cats. That's the whole organizational chart.

---

┌──────────────────────────────────────────────────────────┐
│  RELEASE METADATA                                          │
├──────────────────────────────────────────────────────────┤
│  Lines of Python:    11,599                                │
│  Tests:              195 (all green)                       │
│  Build Steps:        0                                     │
│  Docker Containers:  0                                     │
│  npm Packages:       0                                     │
│  VC Funding:         $0                                    │
│  Meetings Held:      0                                     │
│  Cats Involved:      2                                     │
│  Regrets:            None so far                           │
└──────────────────────────────────────────────────────────┘
