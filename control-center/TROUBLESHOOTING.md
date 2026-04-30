# Troubleshooting

Symptom → Cause → Fix table for **Terminal Control Center (TCC)**. Pair with
[OPERATIONS.md](OPERATIONS.md) for routine operations and
[CHANGELOG.md](CHANGELOG.md) for recent behavior changes.

> Convention: each entry is `Symptom` (what you see) → `Diagnosis` (what to
> check) → `Fix` (the smallest change that resolves it).

---

## Server won't start

### Symptom: `make run` exits with `[Errno 48] Address already in use`

**Diagnosis:** Another process owns port 9527 — usually a forgotten launchd-
managed instance, or an earlier foreground server you `Ctrl+Z`'d but didn't
kill.

**Fix:**

```bash
lsof -iTCP:9527 -sTCP:LISTEN          # see who has the port
launchctl kickstart -k "gui/$(id -u)/com.legacyai.tcc"   # restart the launchd one
# or, if you want a different port:
PORT=18080 make run
```

### Symptom: `ModuleNotFoundError: fastapi`

**Diagnosis:** You're not in the venv, or `make venv` was never run.

**Fix:**

```bash
make venv
source .venv/bin/activate
```

---

## Browser-side problems

### Symptom: Sidebar shows "0 agents" but `curl /api/agents` lists agents

**Diagnosis:** Browser cached an older `index.html` from before a deploy.

**Fix:** Hard-reload the page (Cmd+Shift+R on macOS) or open in a private
window.

### Symptom: Frame appears but the dot stays red ("never connects")

**Diagnosis:** WebSocket failed. Check the browser DevTools Console for a
handshake error.

Common causes:

- Server crashed mid-session — `curl /api/health` will hang or 5xx.
- Reverse proxy strips `Upgrade: websocket` headers.
- macOS App Sandbox / Network Extension is blocking connections.

**Fix:**

```bash
curl -s http://localhost:9527/api/health   # should return {"status":"ok"}
launchctl kickstart -k "gui/$(id -u)/com.legacyai.tcc"
```

### Symptom: Terminal shows nothing even though the dot is green

**Diagnosis:** The PTY is alive but the underlying command produced no output
yet. TUIs (e.g. Charm Bracelet apps) often draw nothing until they receive
a keystroke.

**Fix:** Click into the terminal and press a key (Enter, Space, or whatever
the TUI expects). If still nothing, check
`GET /api/agents/<id>/scrollback/stats` — `buffer_used_bytes: 0` confirms the
process produced nothing; that's a process problem, not a TCC problem.

### Symptom: Delete button does nothing — frame stays on screen

**Diagnosis:** Pre-2026-04-28: a WebGL renderer teardown error crashed the
delete handler. Fixed by wrapping `term.dispose()` in try/catch.

**Fix:** Pull the latest commit (look for "fix(workflows): make top-3 human
workflows pass under Playwright" or later). If still broken, open DevTools
Console, click delete, and report the thrown error.

### Symptom: Terminal renders garbled glyphs / boxes

**Diagnosis:** WebGL renderer initialization failed and xterm fell back, or
the page's font failed to load.

**Fix:** Try `?renderer=canvas` URL parameter (if implemented) or hard-reload.
The default font stack is system mono — if your OS has no mono font installed,
this is a system fix, not a TCC one.

---

## Process / PTY problems

### Symptom: Restart spins forever — dot never turns green again

**Diagnosis:** The command in the agent's config doesn't exist, errored out,
or exited immediately on launch.

**Fix:**

```bash
# Try the command manually to see the failure
cd <agent's working directory>
<agent's command>
```

If the manual run fails, fix the command (or directory) in the agent config
via the UI's edit form.

### Symptom: Process exits but UI says it's still "running"

**Diagnosis:** Status updates from the server arrive over the WebSocket — if
the WS dropped without reconnecting, the UI may show stale state.

**Fix:** Refresh the page. The UI fetches fresh status from `/api/agents` on
load.

### Symptom: New agent fails with `directory does not exist`

**Diagnosis:** Server-side validation rejected the create. The directory must
exist and be readable at the time of creation.

**Fix:** `mkdir -p <directory>` first, then create the agent.

### Symptom: Agent created but stays "stopped" after reload

**Diagnosis:** `auto_start` is off. Only auto-start agents come back after
server restart; otherwise you must click into the agent (or click Restart) to
spawn the process.

**Fix:** Edit the agent and toggle `auto_start: true`, OR click into the
sidebar entry once.

---

## Test / CI problems

### Symptom: `pytest tests/test_workflows_ui.py` fails with `Locator … not found`

**Diagnosis:** The page didn't load completely before the test ran, or the
sidebar was empty (no agents).

**Fix:**

```bash
# Confirm server is up and has agents
curl http://localhost:9527/api/agents | python -m json.tool | head -20

# Re-run with headed mode to watch what's happening
HEADED=1 .venv/bin/pytest tests/test_workflows_ui.py -v
```

If the sidebar is genuinely empty, add at least one agent (the proof test
needs `FLOYD-STABILITY` specifically).

### Symptom: Proof test fails with `floyd produced no output`

**Diagnosis:** `FLOYD-STABILITY` agent's command didn't draw to its TUI
within 15s of WS connection.

**Fix:** Run the floyd binary directly first to confirm it's healthy:

```bash
cd /Volumes/Storage/floyd && floyd-stability   # or whatever the agent uses
```

If the binary itself is broken, fix the binary, not TCC.

---

## Persistence / data problems

### Symptom: All agents disappeared after a server restart

**Diagnosis:** `agents.json` was deleted, moved, or replaced with an empty
object. TCC doesn't auto-recover; it loads what's on disk.

**Fix:**

```bash
# Restore from your most recent backup
cp ~/.tcc-backups/<timestamp>/agents.json ./
launchctl kickstart -k "gui/$(id -u)/com.legacyai.tcc"
```

If you have no backup, but a previous git commit had `agents.json` tracked,
recover it from git history. (In this repo, `agents.json` is gitignored — see
[OPERATIONS.md](OPERATIONS.md) for the recommended backup recipe.)

### Symptom: `agents.json` corrupted (invalid JSON) — server crashes on start

**Diagnosis:** Likely a half-written file from a kill -9 mid-write.

**Fix:** Restore from `~/.tcc-backups/<latest>/`. Failing that, hand-edit the
file so it's valid JSON `{}` and recreate agents from memory.

---

## Network / port problems

### Symptom: `curl http://localhost:9527/api/health` works, but the browser
gets `ERR_CONNECTION_REFUSED`

**Diagnosis:** Browser is reaching for a different host (e.g. you have a
hosts-file entry for `localhost` pointing to IPv6 only and TCC is bound to
IPv4 only).

**Fix:**

```bash
# Confirm bind
lsof -iTCP -sTCP:LISTEN | grep 9527
# If only *:9527 (IPv4): try http://127.0.0.1:9527/ in the browser
# If only [::1]:9527 (IPv6): try http://[::1]:9527/
```

If you need both, change `server.py`'s uvicorn host arg to listen on
`::,0.0.0.0` or use a reverse proxy.

---

## When in doubt

1. `curl http://localhost:9527/api/health` — is the server up?
2. `make test-api` — do all 16 HTTP smoke tests pass?
3. `make test-ui` — do all 3 UI workflows pass?
4. Open DevTools Console in the browser. Errors there usually point at the
   right answer faster than reading server logs.
5. Check the latest entry in `CHANGELOG.md` for recent behavior changes.
