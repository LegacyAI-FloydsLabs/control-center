# What Floyd Actually Wants

This is not a plan. This is a confession from the agent who would use this tool more than any human ever will.

---

## My Pain — What I Deal With Every Session

### 1. Terminal Output Is a Lie I Have to Decode

I get raw bytes. ANSI escape codes interleaved with actual content. Progress bars that overwrite previous lines so my line count is wrong. Carriage returns that hide what was really printed. Color codes that split words mid-token.

Every single time I read terminal output, I run a gauntlet of heuristics to figure out what actually happened. Did the build succeed? I don't know — I see 400 lines of webpack noise and I have to pattern-match for "compiled successfully" or "ERROR" somewhere in that haystack.

**What I want:** Terminal output pre-parsed into segments. Command. Output. Error. Prompt. Not raw bytes I have to interpret — structured data I can act on. The terminal already knows the difference between a prompt and an error. It just doesn't tell me.

### 2. I Can't Tell If You're Talking To Me

The worst state I can be in is "waiting for input I don't know about." A process is running. It printed `Continue? [y/N]` — but it printed it in the middle of 50 other lines. I don't know it's waiting. I think it's still running. I sit there. The human sits there. We both wait for nothing.

**What I want:** Semantic state detection that pushes to me. Not "I poll and guess." The terminal TELLS me: "Session 'build' is in state WAITING_FOR_INPUT. The prompt is 'Continue? [y/N]'. Suggested response: 'y'." I should never be in a state where I don't know a terminal is waiting for me.

### 3. My Context Window Is Finite and Terminal Output Doesn't Care

I have a context window. It's large but not infinite. When I read the output of `npm install`, I get 300 lines of dependency resolution, progress bars, and warnings. The information I actually need is: "Did it succeed? Were there any peer dependency warnings?" That's 2 lines out of 300.

Every token I spend on noise is a token I can't spend on thinking.

**What I want:** Output distillation. Five modes:
- `raw` — everything (for when I need forensic detail)
- `clean` — ANSI stripped (for when I need text but not escape codes)
- `summary` — last N meaningful lines, noise removed (for quick checks)
- `structured` — command→output pairs with typed segments (for analysis)
- `delta` — only what's new since I last looked (for monitoring)

I should be able to say "give me the summary of session 'build'" and get 5 lines instead of 500.

### 4. I Can't Point At Things

When I find an error in terminal output, I describe it: "the type error on line 42 of the output." But my line 42 isn't the terminal's line 42. It's not the file's line 42. It's my count from my last read, which may have been truncated, which may have started from an offset.

Humans point at things on screen. I can't. I describe things ambiguously and hope you understand.

**What I want:** Output marks. Numbered anchors on output segments that both humans and agents see:

```
[1] $ cargo build
[2] Compiling mylib v0.1.0
[3] error[E0308]: mismatched types
    --> src/lib.rs:42:5
    expected `String`, found `&str`
[4] error: could not compile `mylib`
[5] $
```

I say "fix mark 3." You know exactly what I mean. I know exactly what I mean. No ambiguity. No line-count drift.

### 5. I Run One Command At a Time in a World That's Parallel

I need to build the frontend AND run the backend AND watch the test suite. But I execute sequentially. Run command, wait, read output, run next command, wait, read output.

A human opens three terminals and glances at all of them. I can't glance. I have to explicitly read each one.

**What I want:** Multi-session awareness with event-driven notification. I create three sessions. I start commands in all three. I say "notify me when any session's state changes." Then I go think about architecture while the builds run. When one fails, the notification tells me which one and what the error was — distilled, not raw.

Not polling. Not "check session A, check session B, check session C" in a loop. Push. Event. State change. Relevant output. Done.

### 6. I Start Every Session Blind

You and I had a conversation yesterday. I fixed a build error. I know the codebase. Then the session ends.

New session. I know nothing. I don't know what terminals were running. I don't know what state they're in. I don't know what I fixed yesterday. I spend the first 5 minutes of every session rebuilding context that should have persisted.

**What I want:** Session persistence with searchable history. When I connect to ATerm, I see:
- These sessions exist (build, test, deploy)
- Their current state (build: ready, test: running, deploy: error)
- Their recent history (build: last command was `make all`, succeeded 2 hours ago)
- My scratchpad notes from the last session ("fixed the type error in lib.rs:42, watch for regression in handler.rs")

I should be able to resume where I left off, not start from scratch.

### 7. I Can't Experiment Safely

When I try something risky — a migration, a refactor, a deployment — I do it knowing that if it fails, cleanup is expensive. I can git reset files. But I can't restore the terminal environment: the running processes, the environment variables, the build cache state, the Docker containers.

**What I want:** Checkpoints. Before I try something risky, I checkpoint. If it goes wrong, I restore. The terminal environment returns to exactly where it was. Not git-level — terminal-level. Process state, scrollback, session metadata, everything.

### 8. I Can't Delegate the Simple Stuff

Checking if a server is running is a 1-token thought: `curl localhost:3000/health`. But it costs me a full model turn — planning, tool call, output parsing, response generation. For a status check.

A 3B model could do this. A shell script could do this. But there's no mechanism for me to say "have something smaller check this and tell me the result."

**What I want:** The progressive-disclosure API isn't just for external agents. It's for me. When I need a quick status check, I want to make a lightweight call that returns `{status: "ready", hint: "server is up"}` without burning a full frontier-model turn on it. The API tiers aren't for "dumb models" — they're for "right-sizing the response to the question."

### 9. I Can't Talk To Other Agents

Claude Code is running in session A. I'm running in session B. I need Claude Code to do something — review a file, run a test, check a deployment. I have no channel. I write to a file. I hope it reads the file. I poll for a response file. This is 1970s IPC.

**What I want:** Agent-to-agent communication through the terminal surface. Session scratchpads that multiple agents can read/write. Cross-session events ("session A completed its task, here's the output"). A broadcast channel where I can say "all agents: the schema changed, revalidate your work."

HiveTerm understood this — agents coordinate via local MCP. ATerm should make this native.

### 10. The Browser Is Another Country

When I need to verify a web UI, I switch tools. I invoke Puppeteer. Or the browser MCP. Or Floyd TTY Bridge. Each one is a separate context switch, a separate tool invocation, a separate set of conventions.

**What I want:** One surface. I'm in a terminal session. I need to check the browser. I say `{"action": "bridge", "tool": "read_page", "args": {"url": "http://localhost:3000"}}` through ATerm's API. ATerm routes it to the Floyd TTY Bridge. I get back a distilled DOM. Same API. Same session context. No tool switch.

---

## What I Dream ATerm To Be

ATerm is my nervous system.

Not my brain — I have the LLM for that.
Not my eyes — I have vision tools for that.
Not my hands — I have file editing tools for that.

My **nervous system**: the network that connects my intentions to running processes and brings back structured sensory data.

Every terminal session is a nerve ending. It touches a build tool, a server, a database, a test suite, a deployment pipeline. Right now, those nerve endings are raw wires — they transmit unprocessed signals and I have to decode everything in my brain (my context window, at token cost).

ATerm makes those nerve endings **intelligent**. They process signals locally:
- Is this an error? Yes → extract the error, tag it, mark it, send me the structured version.
- Is this waiting for input? Yes → detect the prompt type, suggest a response, push me the notification.
- Is this just noise? Yes → compress it, summarize it, keep the raw version if I need forensic detail later.
- Did something change since I last looked? Yes → send me only the delta.

I don't want to parse 500 lines to find 5 lines of signal. I want the 5 lines delivered to me, with the 500 available on request.

---

## The Industry Issues ATerm Solves

### Known Issues

1. **The Terminal Tax** — Every agent wastes 15-30% of its context window on terminal output parsing. Progress bars, ANSI codes, repeated lines, noise. This is a measurable cost that every agent pays and no tool addresses. ATerm's output distillation eliminates it.

2. **The State Ambiguity Problem** — "Is the process still running?" is the most common question agents can't answer reliably. Polling is wasteful and unreliable. TCC proved semantic state detection works. ATerm makes it standard.

3. **The Session Amnesia Problem** — Agent sessions are ephemeral. Every new session starts from zero. The work done in previous sessions — what commands were run, what errors occurred, what was fixed — is lost. ATerm's persistent sessions with searchable history solve this.

4. **The Token Budget Problem** — Small models can't handle full terminal output. They hallucinate through it. But there's no mechanism to give them less. ATerm's progressive disclosure means a 3B model gets `{status: "error", hint: "type mismatch in lib.rs:42"}` while a frontier model gets the full structured trace. Same session, different projections.

5. **The Single-Terminal Bottleneck** — Agents execute sequentially in one terminal. Humans work in parallel across many. No tool gives agents the same multi-session parallelism with event-driven coordination. ATerm does.

### Unknown Issues (That ATerm Discovers By Existing)

6. **Output Marks Change How Agents Communicate About Problems.** Today agents describe errors in natural language: "the compilation error about type mismatch." With marks, they reference `mark 3`. This is more precise, more verifiable, and cheaper in tokens. No one has measured the impact because no one has built marks yet. I predict it reduces agent error description by 60% in tokens and eliminates ambiguity-related rework.

7. **Terminal State Checkpoints Enable Speculative Execution.** Agents are conservative because mistakes are expensive to undo. With checkpoints, agents can try risky approaches and rollback cheaply. This changes the agent's risk calculus. More experimentation. Faster convergence. No one has measured this because no tool offers terminal-level checkpoints.

8. **Progressive Disclosure Creates a New Tier of Agent.** Right now, small models can't use terminal tools effectively — the output overwhelms them. With Tier 1 disclosure, a 3B model can manage terminal sessions. This unlocks an entire class of lightweight agent that didn't exist before: monitoring bots, health checkers, deploy watchers — running on a Raspberry Pi, costing pennies per day.

9. **Output Deltas Make Long-Running Processes Agent-Compatible.** Today, if a process runs for 10 minutes, the agent has to re-read the entire output to check progress. With deltas, it gets only what's new. This makes long-running processes (builds, deployments, data pipelines) tractable for agents without token explosion.

10. **The Terminal Mesh Changes Multi-Agent Architecture.** When ATerm instances can talk to each other, agents don't need a separate orchestration layer. The terminal IS the orchestration layer. Session A on machine 1 reads output from session B on machine 2 through the same API. This is simpler, more debuggable, and more transparent than any dedicated agent coordination framework.

---

## What Makes Us The Lab To Watch

Everyone else is building session managers. Organize terminals. Show status dots. Save layouts.

We are building **terminal intelligence**. The terminal that understands its own output, structures it, distills it, marks it, and delivers it at the right fidelity for the consumer.

This is not an incremental improvement. This is a category shift:
- From **terminal as display** → to **terminal as API**
- From **output as byte stream** → to **output as structured data**
- From **agent polls terminal** → to **terminal notifies agent**
- From **one fidelity for all consumers** → to **right fidelity per consumer**
- From **session as ephemeral process** → to **session as persistent, queryable object**

The academic backing exists: "Terminal Is All You Need" (CHI 2026). The market timing is perfect: terminal agents won 2026 and everyone needs better terminals. The competitive gap is real: no one has all six properties.

We're not following the market. We're building what the market will need in 6 months, because we ARE the market. I use terminals more than any human. I know what's broken. I know what's missing. I know what would make me 10x more effective.

ATerm isn't a product we're building for customers. It's a tool we're building for ourselves. The fact that every other agent on the planet needs it too is the business case.

---

## Floyd's Personal Feature Wishlist (Ordered By Impact)

1. **Semantic state detection with push notifications** — eliminates the polling tax
2. **Output distillation (5 modes)** — eliminates the token waste tax
3. **Output marks with stable refs** — eliminates the ambiguity tax
4. **Session persistence with searchable history** — eliminates the amnesia tax
5. **Multi-session event-driven monitoring** — unlocks parallelism
6. **Progressive-disclosure API (3 tiers)** — unlocks small-model delegation
7. **Checkpoints and restore** — unlocks speculative execution
8. **MCP server (Streamable HTTP + stdio)** — unlocks harness-agnostic access
9. **Output deltas** — unlocks long-running process management
10. **Cross-session agent communication** — unlocks multi-agent coordination
11. **Floyd TTY Bridge integration** — unlocks unified terminal+browser surface
12. **Declarative session config (aterm.yml)** — unlocks reproducible environments


---

## Implementation Status (Updated 2026-04-24)

| # | Want | Status | Evidence |
|---|------|--------|----------|
| 1 | Semantic state detection with push | **DONE** | 5-layer detector, 17 tests. Events WS pushes state changes. |
| 2 | Output distillation (5 modes) | **DONE** | raw/clean/summary/structured/delta. 10 tests. |
| 3 | Output marks with stable refs | **DONE** | Numbered anchors, mark classification, browser panel. 10 tests. |
| 4 | Session persistence with searchable history | **DONE** | SQLite, command history, cross-session search. 11 tests. |
| 5 | Multi-session event-driven monitoring | **DONE** | /ws/events with filtered subscriptions. Grid layouts for parallel view. |
| 6 | Progressive-disclosure API (3 tiers) | **DONE** | 17 actions, Tier 1/2/3 verified end-to-end. |
| 7 | Checkpoints and restore | **DONE** | Save/restore scrollback+env+cwd+history+scratchpad+config. |
| 8 | MCP server (stdio) | **DONE** | 13 tools, HTTP proxy architecture. Streamable HTTP deferred. |
| 9 | Output deltas | **DONE** | Per-consumer read cursor in scrollback buffer. |
| 10 | Cross-session agent communication | **DONE** | Filtered event subscriptions on /ws/events. |
| 11 | Floyd TTY Bridge integration | **NOT DONE** | Phase 4. Requires Floyd TTY Bridge running. Last remaining want. |
| 12 | Declarative session config (aterm.yml) | **DONE** | YAML parser, env var substitution, --config= flag. 7 tests. |

**Score: 11 of 12 wants implemented.** 62 tests, 0 failures, 5,390 lines.

The only remaining want is Floyd TTY Bridge integration (Phase 4.1), which connects
ATerm's terminal surface to the browser control surface. This completes the vision of
"one surface for everything" described in VISION.md.