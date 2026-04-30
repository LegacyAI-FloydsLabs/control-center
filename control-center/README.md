# Terminal Control Center

A web-based multi-terminal manager for running, monitoring, and controlling
multiple processes from a single browser tab. Built with a Python FastAPI
backend and a zero-build vanilla JavaScript frontend using xterm.js.

## Features

- **Multi-terminal grid** — run multiple processes side-by-side with auto, 1×1, 2×1, 3×1, and 2×2 layouts
- **Tab view** — switch between terminals in a tabbed interface
- **WebSocket PTY** — full interactive terminal sessions over WebSocket with xterm.js
- **Scrollback & search** — 10 000-line scrollback buffer with in-terminal search (Ctrl+F)
- **Broadcast mode** — type once, send input to all terminals simultaneously
- **Agent persistence** — agent configs saved to `agents.json`; processes survive page reloads
- **Auto-start** — mark agents to launch automatically when the server starts
- **Pinned agents** — pin important agents to the top of the list
- **Tag filtering** — organize agents with tags and filter the sidebar
- **Bulk operations** — multi-select agents for batch restart or delete
- **Drag-and-drop reorder** — rearrange terminal panels by dragging headers
- **Import / Export** — backup and restore agent configurations as JSON
- **Quick presets** — one-click creation of bash, python3, node, zsh, or htop sessions
- **Command palette** — VS Code-style command palette (Ctrl+K)
- **macOS launchd integration** — schedule agents as timers, folder hooks, or keep-alive daemons
- **Light & dark themes** — toggle with the theme button in the sidebar
- **Font size control** — per-terminal font size adjustment (A+ / A− buttons)
- **Scrollback export** — download terminal output as plain text
- **Context menu** — right-click terminals for copy, paste, clear, search, fullscreen
- **WebGL rendering** — hardware-accelerated terminal rendering when available

## Prerequisites

- Python 3.10+
- pip or uv

## Installation

```bash
git clone <repo-url> terminal-control-center
cd terminal-control-center

# Option 1: Use a virtual environment (recommended on macOS 26+)
make venv
source .venv/bin/activate

# Option 2: Install directly (may require --break-system-packages on externally-managed Python)
pip install -r requirements.txt

# Option 3: Use uv (fastest, no venv needed)
uv pip install -r requirements.txt
```

## Usage

```bash
# Start the server (default: http://localhost:10527)
python server.py

# Or use the Makefile
make run

# Custom port via environment variable
PORT=8080 python server.py
```

Open `http://localhost:10527` in your browser.

> **Port 3000 is forbidden** in this environment (see `.supercache/manifests/port-allocation-policy.yaml`).
> The Legacy Agents ControlBoard uses port 10527 by default (upstream TCC at port 9527 is untouched). Override with the `PORT` environment variable.

## Daily-Use Workflows

TCC is built around three workflows that must always work for daily-driver reliability:

1. **Open TCC → click into a terminal → send commands → see live output**
   - Click the agent name in the left sidebar.
   - The terminal frame appears in the grid; the dot turns green when the WebSocket attaches and the PTY is live.
   - Type into the terminal as you would in any shell.
2. **Add / Edit / Delete an agent**
   - Fill in the "Add Agent" form in the sidebar (name, directory, command, optional tags).
   - Edit-in-place via the agent's frame header; pin or move via drag-and-drop.
   - Delete from the frame header — the confirm dialog removes both the panel and the persisted record.
3. **Stop / Start / Restart agent processes**
   - Each frame has a restart button; the dot turns red while the PTY recycles, green when the new process is connected.
   - Bulk start/stop/restart from the bulk action bar (select agents → bulk operation).

Every other feature builds on these three. They are covered by Playwright tests (`tests/test_workflows_ui.py`) that run on every change.

## Testing

```bash
# All tests against a running server (the launchd-managed instance is fine)
make test           # 19 fast tests (~12s) — API endpoints + 3 UI workflows
make test-api       # HTTP-only smoke tests, ~0.4s
make test-ui        # Playwright UI workflow tests, ~12s headless
make test-proof     # 10/10 close→reopen→headed-floyd proof (bounces server)
make secret-scan    # Scan tracked files for credential patterns
```

Watch tests run on a real Chromium window:

```bash
HEADED=1 .venv/bin/pytest tests/test_workflows_ui.py -v
```

The full test guide (including the proof contract and CI guidance) is in [`tests/README.md`](tests/README.md).

## Documentation Index

- [`OPERATIONS.md`](OPERATIONS.md) — install / run / launchd / backups / upgrades.
- [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) — symptoms → causes → fixes.
- [`CHANGELOG.md`](CHANGELOG.md) — every user-visible change with timestamps.
- [`tests/README.md`](tests/README.md) — testing guide and proof contract.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open command palette |
| `Ctrl+N` | Focus the "Add Agent" form |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+F` | Search in focused terminal |
| `Ctrl+1`–`9` | Focus terminal by position |
| `Escape` | Exit fullscreen / close palette / close search |

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Browser (index.html)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ xterm.js │ │ xterm.js │ │ xterm.js │  ...    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘        │
│       │ WebSocket   │            │              │
└───────┼─────────────┼────────────┼──────────────┘
        │             │            │
┌───────┴─────────────┴────────────┴──────────────┐
│  FastAPI server (server.py)                     │
│  ┌────────────────────────────────────────────┐ │
│  │ /ws/{id}   — WebSocket ↔ PTY bridge       │ │
│  │ /api/*     — REST CRUD for agents         │ │
│  │ /          — serves index.html            │ │
│  └────────────────────────────────────────────┘ │
│  PTY processes (asyncio subprocess + pty)       │
│  agents.json (persistence)                      │
└─────────────────────────────────────────────────┘
```

- **Frontend:** Single `index.html` file — no build step, no npm, no bundler.
  Loads xterm.js and addons from CDN.
- **Backend:** Single `server.py` file — FastAPI with async PTY management.
  Each agent gets a pseudo-terminal; output is streamed to all connected
  WebSocket clients. Processes persist independently of browser connections.
- **Persistence:** Agent definitions stored in `agents.json` (gitignored).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List all agents with status |
| POST | `/api/agents` | Create a new agent |
| PUT | `/api/agents/{id}` | Update an agent |
| DELETE | `/api/agents/{id}` | Delete an agent and kill its process |
| POST | `/api/agents/{id}/restart` | Restart an agent |
| POST | `/api/agents/{id}/resize` | Resize terminal (cols, rows) |
| GET | `/api/agents/{id}/scrollback` | Download scrollback as text |
| GET | `/api/agents/{id}/status` | Get agent run status |
| GET | `/api/agents/{id}/launchd` | Get launchd plist status |
| POST | `/api/broadcast` | Send input to multiple agents |
| POST | `/api/bulk/start` | Start all stopped agents |
| POST | `/api/bulk/stop` | Stop all running agents |
| POST | `/api/bulk/restart` | Restart all running agents |
| GET | `/api/templates` | List templates |
| POST | `/api/templates` | Create a template |
| DELETE | `/api/templates/{id}` | Delete a template |
| GET | `/api/export` | Export agent configs as JSON |
| POST | `/api/import` | Import agent configs from JSON |
| GET | `/api/tags` | List all unique tags |
| GET | `/api/health` | Health check |
| WS | `/ws/{id}` | Terminal WebSocket connection |

## License

MIT
