# Operations

Day-2 operations guide for **Terminal Control Center (TCC)** — install, run,
launchd integration, backups, upgrades, and shutdown.

> Daily user reference. Pair with [TROUBLESHOOTING.md](TROUBLESHOOTING.md) when
> something is wrong, and [CHANGELOG.md](CHANGELOG.md) for what changed and
> when.

---

## System requirements

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| OS          | macOS 13+ or Linux | Built and tested on macOS 26 (Darwin 25.5.0). launchd integration is macOS-only. |
| Python      | 3.10+ | The author runs 3.14 in `.venv`; 3.10 is the floor. |
| Browser     | Modern Chromium / Safari / Firefox | xterm.js with WebGL renderer used when available. |
| Disk        | < 50 MB for code + venv | `agents.json` and scrollback are tiny. |

---

## Install (clean machine)

```bash
git clone <repo-url> terminal-control-center
cd terminal-control-center

make venv                        # creates .venv and installs deps
source .venv/bin/activate        # so subsequent commands use the venv
.venv/bin/playwright install chromium  # only needed if you'll run UI tests
```

Verify:

```bash
.venv/bin/python -c "import fastapi, uvicorn, pydantic; print('deps ok')"
```

---

## Run (foreground)

```bash
make run
# or
.venv/bin/python server.py
# or with a custom port
PORT=18080 .venv/bin/python server.py
```

Open `http://localhost:10527/`. The default port is **10527** (Legacy Agents ControlBoard; upstream TCC at port 9527 is untouched); port 3000 is
forbidden by the local environment policy.

Stop: `Ctrl+C` in the foreground terminal.

---

## Run as a launchd-managed service (macOS, recommended)

The author's daily setup runs TCC under launchd as `com.legacyai.tcc` so it
restarts after reboot and can be bounced from the command line.

```bash
# Status
launchctl print "gui/$(id -u)/com.legacyai.tcc" | head

# Bounce cleanly (kills + relaunches under the same plist)
launchctl kickstart -k "gui/$(id -u)/com.legacyai.tcc"

# Stop without auto-restart
launchctl bootout "gui/$(id -u)/com.legacyai.tcc"

# Re-enable
launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/com.legacyai.tcc.plist
```

The proof test (`make test-proof`) uses `kickstart -k` to verify that a clean
bounce yields ten consecutive successful headed sessions.

---

## Persisted state

| File           | Purpose                                            | Backup? |
|----------------|----------------------------------------------------|---------|
| `agents.json`  | Agent definitions — name, command, dir, tags, etc. | **Yes** — daily backup recommended. |
| `templates.json` | User-defined command templates.                  | Yes if you have custom templates. |
| `state.json`   | Last-running set + per-agent restart metrics.      | No — recomputed at start. |
| `layouts.json` | Saved grid layouts.                                | Optional. |

**Backup recipe** (e.g. before an upgrade):

```bash
mkdir -p ~/.tcc-backups
cp agents.json templates.json layouts.json ~/.tcc-backups/$(date +%Y%m%d-%H%M%S)/
```

`agents.json` is also exportable via the UI (Settings → Export) and re-importable.

---

## Upgrades

```bash
git pull
make venv                         # idempotent — reuses .venv if present
launchctl kickstart -k "gui/$(id -u)/com.legacyai.tcc"   # if launchd-managed
make test                         # 19 tests; full pass = upgrade safe
```

If `make test` fails after an upgrade, check
[TROUBLESHOOTING.md](TROUBLESHOOTING.md) and `git log --oneline -10` for the
last known-good commit.

---

## Logs and observability

- **Server logs** — wherever you redirected `python server.py` stdout/stderr,
  or via `~/Library/Logs/tcc.log` if your launchd plist redirects there.
- **Per-agent scrollback** — the in-memory ring buffer is exportable via the
  download button on each frame, or via `GET /api/agents/{id}/scrollback`.
- **Performance metrics** — `GET /api/performance` returns
  `running_agents`, `max_rss_kb`, and uptime.

---

## Shutdown

Graceful:

```bash
# Foreground: Ctrl+C
# launchd: launchctl bootout "gui/$(id -u)/com.legacyai.tcc"
```

Hard kill (only if graceful failed):

```bash
kill -TERM "$(lsof -tiTCP:10527 -sTCP:LISTEN)"
```

Note: hard-killing the server orphans PTY child processes — they'll exit on
their own when their PTY closes, but if you want to clean them up first, use
the bulk-stop action in the UI before shutting down.

---

## Security posture

- TCC is **single-user, localhost-only** by design.
- No authentication. Anyone with shell access to the machine can reach the
  server.
- Do not bind TCC to a public interface. If you need remote access, tunnel
  it (`ssh -L 10527:localhost:10527 host`).
- `make secret-scan` (or `./scripts/secret-scan.sh`) catches credential
  patterns in tracked files. Run it before any push.

---

## Where to ask for help

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
2. Check `tests/artifacts/<test-name>/` for the most recent screenshot, page
   HTML, and console log if a test or run failed.
3. Check `git log` and `CHANGELOG.md` for recent behavior changes.
