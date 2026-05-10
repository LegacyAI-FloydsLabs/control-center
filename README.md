# Floyd's Unified Command Kernel

![Floyd's Unified Command Kernel](FloydsUnifiedCommandKernel.jpeg)

---

Here's the situation.

Douglas had a terminal app. And a workspace editor. And an agent runner. And a system health monitor. And an infrastructure mapper. And a project governance dashboard. Each one worked fine on its own. Each one had its own port, its own window, its own personality disorder.

Opening all of them at once looked like a crime scene on a monitor. Six browser tabs, four localhost ports, and the distinct feeling that something built by one person in a garage should probably not require a doctoral degree in window management just to check if an agent was still running.

So he built one thing.

The Kernel is that thing. One FastAPI backend on port 10527. One zero-build vanilla JavaScript frontend. Eleven tabs. Every capability copied in, adapted, and owned by one application. The originals still exist as standalone products — the Kernel just absorbed their code like a particularly opinionated amoeba.

It runs in a garage in Brown County, Indiana. Bella walks on the keyboard during code reviews. Bowser stares at the router like it owes him money. Neither of them has ever once asked whether we should "leverage our synergies across the platform ecosystem."

The initials stand for Floyd's Unified Command Kernel. If you think they stand for anything else, that's a you problem. Bella is already judging you for it.

---

## The Stack

- **Backend:** FastAPI on Python 3.14
- **Frontend:** Vanilla JavaScript — zero build, zero bundler, zero npm horrors
- **Port:** 10527
- **Tests:** 195. All green.
- **Cats supervising:** 2

---

## Running It

```bash
make venv
make run
```

Then hit `http://localhost:10527/`.

That's the whole setup. Two commands. If you need a Docker container, a Helm chart, and a prayer circle to start a development tool, someone sold you a lifestyle, not software.

---

## Verifying It

```bash
.venv/bin/python -m pytest -v
```

195 tests pass. If they don't, something went sideways and the test suite will tell you exactly what. Some workflow tests want Playwright — run `.venv/bin/playwright install` for those.

---

## The 11 Tabs

| Tab | What It Does |
|---|---|
| Project Control | Scan projects, quarantine the ones lying to you, tag everything |
| Terminal Console | Real PTY over WebSocket, xterm.js, actual terminal things |
| Dual Console | Two terminals side by side. Because obviously. |
| Workspace | Browse your filesystem without leaving the browser |
| Workspace Editor | Full code editor. Injected into the DOM. Not in a sad iframe. |
| System Health | What's broken, why it's broken, and how long it's been broken |
| System Map | Infrastructure cartography. Yes, that's a real thing now. |
| Agent Execution | ATerm-powered agent terminals. Real PTY. Real sessions. Real output. |
| Dev Launcher | Launch dev tools. Lives in an iframe because it has commitment issues. |
| Spend Watch | Where did the money go. |
| Mac Cleanup | Cleanup reports for when the disk fills up with mysteries. |

---

## The Rules

1. **One product.** Not six apps holding hands. One.
2. **Copy real code in.** Not rewritten from memory like a midterm essay.
3. **Don't touch the originals.** They're standalone products. The Kernel borrows. It doesn't steal.
4. **Iframes only when necessary.** Some things need DOM isolation. Most things don't.
5. **Everything is Kernel-native.** Routes, ports, names. No archaeology required.

---

## The Docs

| File | Why It Exists |
|---|---|
| `control-center/SSOT/control-center_SSOT.md` | The source of truth. Read it first or don't complain when things don't make sense. |
| `control-center/docs/FEATURES.md` | Every feature — live and dormant — with full technical detail. The serious doc. |
| `CHANGELOG.md` | What shipped, when, and why. |
| `control-center/docs/RELEASE.md` | Release manifest. |

---

## The Cats

**Bella** — QA Director. Substantial carriage. Walks on keyboards during critical deploys. Has never filed a false positive. Files many true positives, usually at 3 AM, usually by sitting on the escape key.

**Bowser** — Technical Director. Suspiciously competent for someone who weighs nine pounds. Monitors the router. Judges latency. Has opinions about DNS that he cannot articulate but absolutely communicates through staring.

Both of them were asleep on the desk when 195 tests went green. Neither of them cared. That's the correct response.

---

BUILT IN A GARAGE, NOT A BOARDROOM 

Location:    Brown County, Indiana                      
Funding:     $0 and a dream                             
Meetings:    None that weren't with cats                
Standups:    Bella sat on the keyboard. That counts.    
Coffee:      Motor oil adjacent                         
Ship Status: 195 tests green. We sleep eventually. 
