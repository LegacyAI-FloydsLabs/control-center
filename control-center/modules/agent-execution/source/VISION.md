# ATerm — Vision: The Agent's Operating Surface

## The Trajectory

Follow the lines:

**Line 1 — Terminal agents won.** OpenCode: 140K stars. Claude Code: default tool for Opus 4.7. Codex, Gemini CLI, Aider, Goose — all terminal-first. The academic paper proved it wasn't accidental: representational compatibility, transparency, low barriers. Terminal Is All You Need.

**Line 2 — Managing terminal chaos is the 2026 problem.** cmux, Beam, freshell, HiveTerm, Termdock — all launched in the last 90 days. All solving the same problem: "I run 5-10 agents simultaneously and can't keep track." But they're all **session managers**. They organize terminals. They don't make terminals smarter.

**Line 3 — MCP became the USB-C.** 251+ servers. Linux Foundation governance. Anthropic + Block + OpenAI co-stewarding. Streamable HTTP. Tasks primitive. Multimodal coming. Every tool that wants to matter speaks MCP.

**Line 4 — Output is the bottleneck.** Agents run commands. Agents get output. Output is a raw byte stream full of ANSI, progress bars, warnings, prompts, errors, and actual information. Every agent wastes tokens parsing it. Every small model hallucinates through it. No one has solved this at the terminal layer.

**Line 5 — Three Floyd's Labs projects discovered the same truth separately.** TCC: terminals are managed processes with semantic state. MWIDE: the terminal lives in a richer surface. Floyd TTY Bridge: the terminal is the agent's primary interface, everything else is a tool reached through it.

These five lines converge at one point. ATerm is that point. But ATerm isn't the destination — it's the vehicle. The destination is further.

---

## Where This Leads

### Phase 0: Now (What Everyone Is Building)
**Session manager.** Organize terminals. Show status dots. Save layouts. Let agents run side-by-side.

Every competitor is here. cmux, Beam, freshell, HiveTerm, Termdock. All of them. They are answering the question: "How do I see all my agents at once?"

ATerm starts here but doesn't stay.

### Phase 1: The Terminal That Understands Itself
**Output Intelligence.** The terminal parses its own output in real-time. It doesn't just display bytes — it knows:

- This is a prompt (shell is ready)
- This is an error (build failed, with structured error info)
- This is waiting for input (y/n, password, confirm)
- This is progress (downloading, compiling, 45%)
- This is the result (the actual output the agent needs)

And it delivers this understanding through a progressive-disclosure API:
- 3B model: "status: error, hint: fix the type error on line 42"
- 70B model: structured command→output pairs with marks
- Frontier model: full scrollback with refs, deltas, and execution trace

**No one else has this.** This is FLUM Rule 000 made real. The terminal's output becomes an API, not a byte stream.

### Phase 2: The Terminal as MCP Server
**Every session operation is a tool.** `aterm_run`, `aterm_read`, `aterm_create`, `aterm_checkpoint`. Any MCP client — Claude Code, Cursor, any harness — connects and gets structured terminal control.

This means: Claude Code doesn't need its own bash tool with its own PTY management. It connects to ATerm and gets managed sessions with semantic state, crash recovery, scrollback intelligence, and output distillation. Better terminals than it can build alone.

This means: A 3B model running on a Raspberry Pi can manage terminal sessions through the same MCP interface as Opus 4.7, because the progressive-disclosure API gives it only what it can handle.

This means: An agent doesn't know or care whether the terminal is local, remote, in a Docker container, or on a VM in another country. It talks to ATerm's MCP server. ATerm handles the rest.

### Phase 3: The Terminal as Agent Runtime
**ATerm becomes where agents live, not just where they run commands.**

Each session is a managed object with:
- Persistent identity (name, tags, metadata)
- Semantic state (ready/busy/error/waiting)
- Working memory (scratchpad, checkpoints)
- Execution history (recorded workflows, command history)
- Automation rules (cron, hooks, keepalive, restart policies)
- Health monitoring (CPU, memory, uptime, restart count)

This isn't a terminal emulator anymore. It's an **agent process manager** with a terminal interface. The terminal is how agents interact with the system. ATerm is what manages those interactions.

The `hive.yml` pattern from HiveTerm is the right shape: declarative agent configurations committed to repos. But ATerm goes further — it doesn't just launch agents, it understands what they're doing, distills their output, detects their state, and routes their communication.

### Phase 4: The Terminal as Integration Fabric
**ATerm bridges everything.**

- Terminal sessions → ATerm manages PTYs
- Browser actions → ATerm bridges to Floyd TTY Bridge
- MCP tools → ATerm aggregates MCP servers
- File operations → ATerm provides scoped filesystem access
- Git operations → ATerm exposes git state per session
- Monitoring → ATerm surfaces metrics, logs, health

The mega-skills pipeline plugs in here:
- Agent writes code → Change Impact Analyzer runs through ATerm's API
- Build fails → Error Resolution Engine reads ATerm's structured error output
- Tests pass → Completion Fortress validates via ATerm's verify action
- Session ends → Learning Engine crystallizes patterns from ATerm's recorded workflows

ATerm isn't just the terminal. It's the **integration surface** that connects agents to everything else through the terminal abstraction. Because the terminal is text, and text is what agents understand.

### Phase 5: The Network of Terminals
**ATerm instances talk to each other.**

One ATerm server manages a developer's local sessions. Another manages CI/CD runners. Another manages production monitoring terminals. Another manages a fleet of agent workers.

They share a common protocol (MCP over Streamable HTTP). An agent on one ATerm can read output from a session on another. A `hive.yml` can reference sessions on remote ATerm instances.

The developer opens their browser. They see all their terminals — local, remote, CI, production — in one interface. Each session has semantic state. Each session's output is distilled. Each session is an MCP tool.

This is the endgame: **a mesh of intelligent terminals** where agents and humans share the same surface, the same protocol, the same understanding of what's happening.

---

## The ATerm Stack — Projected Forward

```
┌──────────────────────────────────────────────────────────┐
│                    HUMAN INTERFACE                        │
│  Browser UI (React 19 / xterm v6 / Tailwind 4)           │
│  Mobile responsive, PWA, installable                     │
│  Session cards, output marks overlay, workspace switcher  │
├──────────────────────────────────────────────────────────┤
│                    AGENT INTERFACE                        │
│  POST /api/do (progressive disclosure, 3 tiers)          │
│  MCP Server (Streamable HTTP + stdio)                    │
│  WebSocket (real-time output streaming)                  │
│  OSC hooks (in-terminal agent notifications)             │
├──────────────────────────────────────────────────────────┤
│                 OUTPUT INTELLIGENCE                       │
│  Semantic state detection (20+ prompt, 25+ error pats)   │
│  Output distillation (raw/clean/summary/structured/delta)│
│  Output marks (numbered anchors for agent reference)     │
│  Output refs (stable IDs across scrollback growth)       │
│  Output deltas (new content since last agent read)       │
├──────────────────────────────────────────────────────────┤
│                  SESSION MANAGER                         │
│  Session model (identity, process, lifecycle, intel)     │
│  PTY pool (node-pty, scrollback ring, crash recovery)    │
│  Automation (cron, hooks, keepalive, restart policies)   │
│  Checkpoints (save/restore workspace state)              │
│  Workflow recording (actions → reproducible scripts)     │
├──────────────────────────────────────────────────────────┤
│                 INTEGRATION FABRIC                       │
│  Floyd TTY Bridge (browser control from terminal)        │
│  MCP client (connect to external MCP servers)            │
│  Filesystem bridge (scoped read/write)                   │
│  Mega-skills pipeline (code lifecycle intelligence)      │
│  Agent-to-agent routing (cross-session communication)    │
├──────────────────────────────────────────────────────────┤
│                  PERSISTENCE                             │
│  SQLite (sessions, checkpoints, metrics, patterns)       │
│  JSON compat (TCC agents.json, hive.yml)                 │
│  Session recordings (workflow export)                    │
│  Learning store (crystallized patterns from mega-skills) │
└──────────────────────────────────────────────────────────┘
```

---

## What ATerm Is NOT

ATerm is not an IDE. MWIDE is the IDE.
ATerm is not a browser controller. Floyd TTY Bridge is the browser controller.
ATerm is not a process manager. launchd/systemd are process managers.
ATerm is not an AI chatbot. The agents running inside ATerm are the chatbots.

ATerm is **the surface where all of these meet.** The terminal is the common language. ATerm makes that language structured, intelligent, and accessible to both humans and machines.

---

## The One-Sentence Version

**ATerm is a self-aware terminal that transforms its own output into a structured, progressive-disclosure API — making it simultaneously the ultimate human power-terminal and the native operating surface for AI agents of any size.**

---

## Why This Wins

The "Terminal Is All You Need" paper identified three properties: representational compatibility, transparency, low barriers.

Every competitor implements these properties accidentally — they use a terminal, so they inherit the properties. ATerm implements them **deliberately**:

1. **Representational Compatibility** — Output Intelligence makes terminal output MORE compatible with LLMs by structuring it, distilling it, and marking it. The raw terminal is compatible. ATerm's terminal is optimized.

2. **Transparency** — When an agent runs a command via the API, the human sees it in real-time in the same terminal view. When a human types a command, the agent sees it through the same API. One surface, two consumers, complete transparency.

3. **Low Barriers** — A developer opens a URL. They see terminals. They add sessions. They type commands. No setup, no config, no agent framework, no SDK. The browser is the only requirement. And because it's a PWA, it works offline.

The competitors organize terminals. ATerm understands them.
The competitors add AI next to terminals. ATerm makes terminals AI-native.
The competitors run in Electron. ATerm runs in the browser you already have open.

That's the gap. That's where this leads. That's where we project ourselves NOW.
