import asyncio
import fcntl
import json
import logging
import os
import pty
import shlex
import struct
import sys
import termios
import time
import uuid
from contextlib import asynccontextmanager
from typing import Dict, List, Literal, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator
import uvicorn

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("tcc")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

LAUNCHD_TYPES = {"none", "timer", "hook", "keepalive"}


class AgentCreate(BaseModel):
    name: str
    label: Optional[str] = None  # custom terminal header title (overrides name in UI)
    directory: str
    command: str
    env: Optional[Dict[str, str]] = None
    order: int = 0
    tags: Optional[List[str]] = None
    auto_start: bool = False
    pinned: bool = False
    launchd_type: Literal["none", "timer", "hook", "keepalive"] = "none"
    launchd_interval: int = 3600
    launchd_watchpath: str = ""
    cron_expression: Optional[str] = None  # e.g. "0 * * * *" (minute hour day month weekday)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name must not be empty")
        if len(v) > 100:
            raise ValueError("name must be 100 characters or fewer")
        # Reject path separators, NUL, and control chars — the name shows up in
        # toasts, downloads (suggested filename), and the sidebar. Keep it sane.
        if "/" in v or "\\" in v or "\x00" in v:
            raise ValueError("name must not contain '/', '\\\\', or NUL")
        if any(ord(c) < 0x20 for c in v):
            raise ValueError("name must not contain control characters")
        return v

    @field_validator("launchd_type")
    @classmethod
    def validate_launchd_type(cls, v: str) -> str:
        if v not in LAUNCHD_TYPES:
            raise ValueError(f"launchd_type must be one of {LAUNCHD_TYPES}")
        return v

    @field_validator("cron_expression")
    @classmethod
    def validate_cron(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        parts = v.strip().split()
        if len(parts) != 5:
            raise ValueError("cron_expression must have exactly 5 fields: minute hour day month weekday")
        for p in parts:
            if p == "*":
                continue
            if "/" in p:
                base, step = p.split("/", 1)
                if base not in ("*",) and not base.isdigit():
                    raise ValueError(f"invalid cron step base: {base}")
                if not step.isdigit():
                    raise ValueError(f"invalid cron step: {step}")
            elif "-" in p:
                start, end = p.split("-", 1)
                if not start.isdigit() or not end.isdigit():
                    raise ValueError(f"invalid cron range: {p}")
            elif "," in p:
                if not all(x.isdigit() or x == "*" for x in p.split(",")):
                    raise ValueError(f"invalid cron list: {p}")
            elif not p.isdigit():
                raise ValueError(f"invalid cron field: {p} (use *, digit, */N, M-N, or M,N)")
        return v

    @field_validator("directory")
    @classmethod
    def directory_must_exist(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("directory must not be empty")
        if not os.path.isdir(v):
            raise ValueError(f"directory does not exist: {v}")
        return v

    @field_validator("command")
    @classmethod
    def command_must_parse(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("command must not be empty")
        try:
            shlex.split(v)
        except ValueError as e:
            raise ValueError(f"command is not parseable: {e}")
        return v


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    directory: Optional[str] = None
    command: Optional[str] = None
    env: Optional[Dict[str, str]] = None
    order: Optional[int] = None
    tags: Optional[List[str]] = None
    auto_start: Optional[bool] = None
    pinned: Optional[bool] = None
    launchd_type: Optional[Literal["none", "timer", "hook", "keepalive"]] = None
    launchd_interval: Optional[int] = None
    launchd_watchpath: Optional[str] = None
    cron_expression: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("name must not be empty")
        if len(v) > 100:
            raise ValueError("name must be 100 characters or fewer")
        if "/" in v or "\\" in v or "\x00" in v:
            raise ValueError("name must not contain '/', '\\\\', or NUL")
        if any(ord(c) < 0x20 for c in v):
            raise ValueError("name must not contain control characters")
        return v

    @field_validator("launchd_type")
    @classmethod
    def validate_launchd_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in LAUNCHD_TYPES:
            raise ValueError(f"launchd_type must be one of {LAUNCHD_TYPES}")
        return v

    @field_validator("cron_expression")
    @classmethod
    def validate_cron(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        parts = v.strip().split()
        if len(parts) != 5:
            raise ValueError("cron_expression must have exactly 5 fields: minute hour day month weekday")
        for p in parts:
            if p == "*":
                continue
            if "/" in p:
                base, step = p.split("/", 1)
                if base not in ("*",) and not base.isdigit():
                    raise ValueError(f"invalid cron step base: {base}")
                if not step.isdigit():
                    raise ValueError(f"invalid cron step: {step}")
            elif "-" in p:
                start, end = p.split("-", 1)
                if not start.isdigit() or not end.isdigit():
                    raise ValueError(f"invalid cron range: {p}")
            elif "," in p:
                if not all(x.isdigit() or x == "*" for x in p.split(",")):
                    raise ValueError(f"invalid cron list: {p}")
            elif not p.isdigit():
                raise ValueError(f"invalid cron field: {p}")
        return v

    @field_validator("directory")
    @classmethod
    def directory_must_exist(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("directory must not be empty")
        if not os.path.isdir(v):
            raise ValueError(f"directory does not exist: {v}")
        return v

    @field_validator("command")
    @classmethod
    def command_must_parse(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("command must not be empty")
        try:
            shlex.split(v)
        except ValueError as e:
            raise ValueError(f"command is not parseable: {e}")
        return v


class Agent(BaseModel):
    id: str
    name: str
    label: Optional[str] = None  # custom terminal header title
    directory: str
    command: str
    env: Optional[Dict[str, str]] = None
    order: int = 0
    tags: Optional[List[str]] = None
    auto_start: bool = False
    pinned: bool = False
    launchd_type: str = "none"
    launchd_interval: int = 3600
    launchd_watchpath: str = ""
    cron_expression: Optional[str] = None


class ResizePayload(BaseModel):
    cols: int
    rows: int


class BroadcastPayload(BaseModel):
    agent_ids: List[str]
    input: str


class TemplateCreate(BaseModel):
    name: str
    directory: str
    command: str
    env: Optional[Dict[str, str]] = None
    tags: Optional[List[str]] = None


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

AGENTS_FILE = "agents.json"
TEMPLATES_FILE = "templates.json"
STATE_FILE = "state.json"


def _load_state() -> dict:
    if not os.path.exists(STATE_FILE):
        return {"running": [], "metrics": {}}
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {"running": [], "metrics": {}}


def _save_state(state: dict):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def load_agents() -> Dict[str, dict]:
    if not os.path.exists(AGENTS_FILE):
        with open(AGENTS_FILE, "w") as f:
            json.dump({}, f)
    with open(AGENTS_FILE, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}


def save_agents(agents: Dict[str, dict]):
    with open(AGENTS_FILE, "w") as f:
        json.dump(agents, f, indent=2)


def load_templates() -> Dict[str, dict]:
    if not os.path.exists(TEMPLATES_FILE):
        with open(TEMPLATES_FILE, "w") as f:
            json.dump({}, f)
    with open(TEMPLATES_FILE, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}


def save_templates(templates: Dict[str, dict]):
    with open(TEMPLATES_FILE, "w") as f:
        json.dump(templates, f, indent=2)


# ---------------------------------------------------------------------------
# Launchd Automation Helpers
# ---------------------------------------------------------------------------
import shutil
import subprocess


def _get_plist_path(agent_id: str) -> str:
    return os.path.expanduser(
        f"~/Library/LaunchAgents/com.legacyai.tcc.{agent_id}.plist"
    )


def _generate_launchd_plist(agent_id: str, agent: dict):
    try:
        plist_path = _get_plist_path(agent_id)
        out_log = f"/tmp/tcc_agent_{agent_id}.out.log"
        err_log = f"/tmp/tcc_agent_{agent_id}.err.log"

        # Touch logs to ensure they exist for tail
        open(out_log, "a").close()
        open(err_log, "a").close()

        l_type = agent.get("launchd_type", "none")
        if l_type == "none":
            return

        # Validate working directory exists
        directory = agent.get("directory", "")
        if not os.path.isdir(directory):
            logger.warning(
                "launchd plist skipped: directory %s does not exist", directory
            )
            return

        cmd_args = shlex.split(agent["command"])
        # Resolve to absolute paths for launchd
        resolved_cmd = shutil.which(cmd_args[0]) if cmd_args else None
        if resolved_cmd:
            cmd_args[0] = resolved_cmd

        # Build ProgramArguments XML
        args_xml = ""
        for arg in cmd_args:
            args_xml += f"        <string>{arg}</string>\n"

        trigger_xml = ""
        if l_type == "timer":
            trigger_xml = f"    <key>StartInterval</key>\n    <integer>{agent.get('launchd_interval', 3600)}</integer>"
        elif l_type == "hook":
            watchpath = agent.get("launchd_watchpath", "")
            if watchpath and not os.path.exists(watchpath):
                logger.warning("launchd watch path does not exist: %s", watchpath)
            trigger_xml = f"    <key>WatchPaths</key>\n    <array>\n        <string>{watchpath}</string>\n    </array>"
        elif l_type == "keepalive":
            trigger_xml = "    <key>KeepAlive</key>\n    <true/>\n    <key>RunAtLoad</key>\n    <true/>"

        plist_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.legacyai.tcc.{agent_id}</string>
    <key>WorkingDirectory</key>
    <string>{os.path.abspath(directory)}</string>
    <key>ProgramArguments</key>
    <array>
{args_xml}    </array>
    <key>StandardOutPath</key>
    <string>{out_log}</string>
    <key>StandardErrorPath</key>
    <string>{err_log}</string>
{trigger_xml}
</dict>
</plist>"""
        os.makedirs(os.path.dirname(plist_path), exist_ok=True)
        with open(plist_path, "w") as f:
            f.write(plist_content)

        # Unload if loaded previously, then load
        subprocess.run(["launchctl", "unload", plist_path], capture_output=True)
        result = subprocess.run(["launchctl", "load", plist_path], capture_output=True)
        if result.returncode != 0:
            logger.error(
                "launchctl load failed: %s", result.stderr.decode(errors="replace")
            )
        else:
            logger.info("launchd plist loaded for agent %s", agent_id)
    except Exception:
        logger.exception("Failed to generate launchd plist for agent %s", agent_id)


def _remove_launchd_plist(agent_id: str):
    try:
        plist_path = _get_plist_path(agent_id)
        subprocess.run(["launchctl", "unload", plist_path], capture_output=True)
        if os.path.exists(plist_path):
            os.remove(plist_path)
            logger.info("Removed launchd plist for agent %s", agent_id)
    except Exception:
        logger.exception("Failed to remove launchd plist for agent %s", agent_id)


# ---------------------------------------------------------------------------
# Cron utilities
# ---------------------------------------------------------------------------

def _matches_cron_field(field_val: str, cron_val: int) -> bool:
    """Check if a cron field value matches. Supports *, digit, or list."""
    if field_val == "*":
        return True
    if "," in field_val:
        return str(cron_val) in field_val.split(",")
    if "-" in field_val:
        start, end = field_val.split("-")
        return int(start) <= cron_val <= int(end)
    if "/" in field_val:
        base, step = field_val.split("/")
        step = int(step)
        if base == "*":
            return cron_val % step == 0
        return int(base) <= cron_val and (cron_val - int(base)) % step == 0
    return int(field_val) == cron_val


def compute_next_cron(expression: str, since: float | None = None) -> float | None:
    """Compute the next Unix timestamp this cron expression will fire.
    expression: "min hour day month wday" (5 fields).
    Respects TZ from environment. Scans up to 1 year ahead.
    """
    import datetime as dt
    import calendar
    if since is None:
        since = time.time()
    parts = expression.strip().split()
    if len(parts) != 5:
        return None
    minute_f, hour_f, day_f, month_f, wday_f = parts

    # Normalize TZ offset for display but use naive UTC for computation
    tz_offset = time.timezone if time.daylight == 0 else time.altzone
    start = dt.datetime.fromtimestamp(since + tz_offset)
    # Don't fire in the same minute we just computed
    candidate = start.replace(second=0, microsecond=0) + dt.timedelta(minutes=1)

    for _ in range(366 * 24 * 60):  # max 1 year of minutes
        year = candidate.year
        month = candidate.month
        day = candidate.day
        hour = candidate.hour
        minute = candidate.minute
        wday = candidate.weekday()  # 0=Monday, 6=Sunday (cron uses 0=Sun)

        # cron weekday: 0=Sun but weekday() returns 0=Mon
        cron_wday = (wday + 6) % 7  # convert Mon-based to Sun-based

        if not _matches_cron_field(month_f, month):
            # Advance to next valid month day
            days_in_month = calendar.monthrange(year, month)[1]
            candidate = candidate.replace(day=min(day, days_in_month)) + dt.timedelta(days=31)
            candidate = candidate.replace(day=1, hour=0, minute=0)
            continue
        if not _matches_cron_field(day_f, day):
            candidate += dt.timedelta(days=1)
            candidate = candidate.replace(hour=0, minute=0)
            continue
        if not _matches_cron_field(wday_f, cron_wday):
            candidate += dt.timedelta(days=1)
            candidate = candidate.replace(hour=0, minute=0)
            continue
        if not _matches_cron_field(hour_f, hour):
            candidate += dt.timedelta(hours=1)
            candidate = candidate.replace(minute=0)
            continue
        if not _matches_cron_field(minute_f, minute):
            candidate += dt.timedelta(minutes=1)
            continue
        return candidate.timestamp() - tz_offset
    return None


def get_log_paths(agent_id: str) -> tuple[str, str]:
    """Return (stdout_log, stderr_log) paths for an agent."""
    return (
        f"/tmp/tcc_agent_{agent_id}.out.log",
        f"/tmp/tcc_agent_{agent_id}.err.log",
    )


def get_launchd_info(agent_id: str, agent: dict) -> dict:
    """Get full launchd status info for an agent."""
    plist_path = _get_plist_path(agent_id)
    plist_exists = os.path.exists(plist_path)
    loaded = False
    last_run = None
    run_count = 0
    pid = None
    status_str = "inactive"
    if plist_exists:
        try:
            r = subprocess.run(
                ["launchctl", "list", f"com.legacyai.tcc.{agent_id}"],
                capture_output=True, text=True, timeout=5,
            )
            if r.returncode == 0:
                loaded = True
                for line in r.stdout.splitlines():
                    if line.startswith("\"PID\""):
                        pid = int(line.split("=")[1].strip().rstrip(","))
                    if line.startswith("\"RunCount\""):
                        run_count = int(line.split("=")[1].strip().rstrip(","))
                    if line.startswith("\"LastExitStatus\""):
                        last_exit = line.split("=")[1].strip().rstrip(",")
                        if last_exit == "0":
                            status_str = "running"
                        elif pid:
                            status_str = "finished"
                        else:
                            status_str = "error"
                if pid and not last_run:
                    status_str = "running"
        except Exception:
            pass
    out_log, err_log = get_log_paths(agent_id)
    return {
        "loaded": loaded,
        "plist_exists": plist_exists,
        "status": status_str,
        "pid": pid,
        "run_count": run_count,
        "last_run": last_run,
        "log_out": out_log,
        "log_err": err_log,
    }


# ---------------------------------------------------------------------------
# Process registry — PTY processes persist independently of WebSocket clients
# ---------------------------------------------------------------------------


class ProcessHandle:
    """Holds a running PTY process and its connected WebSocket clients."""

    __slots__ = (
        "process",
        "master_fd",
        "websockets",
        "pty_reader_task",
        "scrollback",
        "scrollback_limit",
        "started_at",
        "restart_count",
        "fd_closed",
        "_reader_closed",
        "last_output_at",
    )

    def __init__(self, process: asyncio.subprocess.Process, master_fd: int):
        self.process = process
        self.master_fd = master_fd
        self.websockets: List[WebSocket] = []
        self.pty_reader_task: Optional[asyncio.Task] = None
        self.scrollback: bytearray = bytearray()
        self.scrollback_limit: int = 64 * 1024  # 64 KB ring
        self.started_at: float = time.time()
        self.restart_count: int = 0
        self.fd_closed: bool = False
        self.last_output_at: float = time.time()

    def close_fd(self):
        """Close master_fd exactly once. Safe to call multiple times."""
        if not self.fd_closed:
            self.fd_closed = True
            try:
                os.close(self.master_fd)
            except OSError:
                pass

    def append_scrollback(self, data: bytes):
        self.scrollback.extend(data)
        self.last_output_at = time.time()
        if len(self.scrollback) > self.scrollback_limit:
            self.scrollback = self.scrollback[-self.scrollback_limit :]

    def get_clean_scrollback(self) -> bytes:
        """Return scrollback buffer for reconnection (just the bytes, no strip)."""
        if not self.scrollback:
            return b""
        # Return the last 32 KB, aligned to newline
        buf = bytes(self.scrollback)
        min_keep = min(len(buf), 32 * 1024)
        search_start = len(buf) - min_keep
        if search_start > 0:
            nl_pos = buf.find(ord("\n"), search_start)
            if nl_pos != -1 and nl_pos < len(buf) - 1:
                buf = buf[nl_pos + 1 :]
        return buf

    def get_raw_scrollback(self) -> bytes:
        """Return raw scrollback for export (strip ANSI escape sequences)."""
        import re
        raw = bytes(self.scrollback).decode("utf-8", errors="replace")
        cleaned = re.sub(r"\x1b\[[0-9;]*[a-zA-Z]", "", raw)
        cleaned = re.sub(r"\x1b\][^\x07]*\x07", "", cleaned)
        cleaned = re.sub(r"\x1b[()][0-9A-B]", "", cleaned)
        return cleaned.encode("utf-8")

    def scrollback_stats(self) -> dict:
        """Return buffer utilization stats."""
        used = len(self.scrollback)
        limit = self.scrollback_limit
        pct = (used / limit * 100) if limit > 0 else 0
        return {
            "buffer_size_bytes": limit,
            "buffer_used_bytes": used,
            "buffer_pct": max(0.1, round(pct, 1)) if used > 0 else 0,
        }

    @property
    def alive(self) -> bool:
        return self.process.returncode is None


running_processes: Dict[str, ProcessHandle] = {}
# Track metrics that persist across restarts
agent_metrics: Dict[str, dict] = {}  # id -> {restart_count, total_uptime, last_started}


async def broadcast_to_clients(handle: ProcessHandle, data: bytes):
    dead: List[WebSocket] = []
    for ws in list(handle.websockets):  # Iterate copy to allow concurrent removal
        try:
            await ws.send_bytes(data)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in handle.websockets:
            handle.websockets.remove(ws)


async def pty_reader_loop(agent_id: str, handle: ProcessHandle):
    """Read PTY output using event-loop add_reader (non-blocking).

    This avoids the thread-executor approach which deadlocks on macOS when
    the fd is closed while a thread is blocked in os.read().
    """
    loop = asyncio.get_running_loop()
    fd = handle.master_fd
    queue: asyncio.Queue[bytes | None] = asyncio.Queue()

    # Set fd to non-blocking so os.read never blocks the event loop.
    flags = fcntl.fcntl(fd, fcntl.F_GETFL)
    fcntl.fcntl(fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

    handle._reader_closed = False

    def _on_readable():
        if handle._reader_closed:
            return  # Already signaled EOF, ignore spurious wake-ups
        try:
            data = os.read(fd, 65536)
            if not data:
                handle._reader_closed = True
                queue.put_nowait(None)
                return
            queue.put_nowait(data)
        except BlockingIOError:
            pass  # Spurious wake, no data yet
        except OSError:
            if not handle._reader_closed:
                handle._reader_closed = True
                queue.put_nowait(None)

    loop.add_reader(fd, _on_readable)
    try:
        while True:
            data = await queue.get()
            if data is None:
                break
            handle.append_scrollback(data)
            await broadcast_to_clients(handle, data)
    except asyncio.CancelledError:
        pass
    except Exception:
        pass
    finally:
        try:
            loop.remove_reader(fd)
        except Exception:
            pass
        # Crash recovery: check BEFORE cleanup removes from running_processes
        should_restart = await _maybe_restart(agent_id, handle)
        await _cleanup_process(agent_id, handle)
        if should_restart:
            await _attempt_crash_restart(agent_id)


async def _maybe_restart(agent_id: str, handle: ProcessHandle) -> bool:
    """Return True if agent should be auto-restarted (auto_start=true, under retry limit)."""
    agents = load_agents()
    if agent_id not in agents:
        return False
    if not agents[agent_id].get("auto_start", False):
        return False
    now = time.time()
    history = agent_metrics.setdefault(agent_id, {}).setdefault("restart_timestamps", [])
    history[:] = [t for t in history if now - t < 300]  # 5-min window
    history.append(now)
    return len(history) <= 3


async def _attempt_crash_restart(agent_id: str):
    """Attempt to restart a crashed auto-start agent. Max 3 retries per 5-min window."""
    agents = load_agents()
    if agent_id not in agents:
        return
    agent = agents[agent_id]
    history = agent_metrics.setdefault(agent_id, {}).setdefault("restart_timestamps", [])
    attempt = len(history)
    logger.info("Auto-restarting crashed agent %s (attempt %d/3)", agent_id, attempt)
    await asyncio.sleep(2)  # Back off
    try:
        await spawn_process(agent_id, agent)
    except Exception:
        logger.error("Auto-restart failed for agent %s", agent_id)


async def _cleanup_process(agent_id: str, handle: ProcessHandle):
    for ws in list(handle.websockets):
        try:
            await ws.send_json({"type": "status", "status": "exited"})
        except Exception:
            pass
    handle.close_fd()
    # Update metrics before killing
    if agent_id in agent_metrics:
        agent_metrics[agent_id]["total_uptime"] += time.time() - handle.started_at
    if running_processes.get(agent_id) is handle:
        running_processes.pop(agent_id, None)
    # Persist running state so sessions survive server restarts
    try:
        state = _load_state()
        state["running"] = list(running_processes.keys())
        state["metrics"] = agent_metrics
        _save_state(state)
    except Exception:
        pass


async def spawn_process(agent_id: str, agent: dict) -> ProcessHandle:
    command_str = agent.get("command", "").strip()
    if not command_str:
        raise ValueError("Agent command is required")
    directory = agent.get("directory", "/")
    if not os.path.isdir(directory):
        raise ValueError(f"Directory does not exist: {directory}")
    agent_env = agent.get("env")

    cmd_args = shlex.split(command_str)
    master_fd, slave_fd = pty.openpty()
    winsize = struct.pack("HHHH", 24, 80, 0, 0)
    fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)

    proc_env = os.environ.copy()
    proc_env["TERM"] = "xterm-256color"
    if agent_env:
        proc_env.update(agent_env)

    process = await asyncio.create_subprocess_exec(
        *cmd_args,
        stdin=slave_fd,
        stdout=slave_fd,
        stderr=slave_fd,
        cwd=directory,
        env=proc_env,
        close_fds=True,
    )
    os.close(slave_fd)

    handle = ProcessHandle(process, master_fd)

    # Carry over restart count from metrics
    if agent_id not in agent_metrics:
        agent_metrics[agent_id] = {
            "restart_count": 0,
            "total_uptime": 0.0,
            "last_started": time.time(),
        }
    else:
        agent_metrics[agent_id]["last_started"] = time.time()
    handle.restart_count = agent_metrics[agent_id]["restart_count"]

    running_processes[agent_id] = handle
    handle.pty_reader_task = asyncio.create_task(pty_reader_loop(agent_id, handle))
    return handle


async def kill_process(agent_id: str):
    _remove_launchd_plist(agent_id)
    handle = running_processes.pop(agent_id, None)
    if handle is None:
        return
    # Update metrics before killing
    if agent_id in agent_metrics:
        agent_metrics[agent_id]["total_uptime"] += time.time() - handle.started_at
    # 1. Remove the fd from the event loop and close it.  This stops the
    #    add_reader callback and causes the reader coroutine's queue.get()
    #    to receive None on the next (or current) _on_readable call.
    loop = asyncio.get_running_loop()
    try:
        loop.remove_reader(handle.master_fd)
    except Exception:
        pass
    handle.close_fd()
    # 2. Cancel the reader task — unblocks queue.get() immediately.
    if handle.pty_reader_task and not handle.pty_reader_task.done():
        handle.pty_reader_task.cancel()
        try:
            await asyncio.wait_for(asyncio.shield(handle.pty_reader_task), timeout=1.0)
        except (asyncio.CancelledError, asyncio.TimeoutError, Exception):
            pass
    # 3. Terminate/kill the child process.
    try:
        handle.process.terminate()
        await asyncio.wait_for(handle.process.wait(), timeout=2.0)
    except (ProcessLookupError, asyncio.TimeoutError):
        try:
            handle.process.kill()
        except ProcessLookupError:
            pass
    # 4. Notify WebSocket clients.
    for ws in list(handle.websockets):
        try:
            await ws.send_json({"type": "status", "status": "disconnected"})
            await ws.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------


# Track last cron fire time per agent (in-memory; survives via agent_metrics on disk)
_cron_last_fire: dict[str, float] = {}


async def _cron_scheduler_loop():
    """Background scheduler — every 60s, fire any agent whose cron_expression is due.

    Honors `last_started` from agent_metrics so we don't double-fire within the
    same minute across server restarts. A fire is just `spawn_process` (the
    same path the UI uses when you click an agent), which means cron-fired
    agents show up live in the UI exactly like manually-started ones.
    """
    while True:
        try:
            await asyncio.sleep(60)
            agents = load_agents()
            now = time.time()
            for agent_id, agent in agents.items():
                expr = agent.get("cron_expression")
                if not expr:
                    continue
                # When was the last fire for this agent?
                last = _cron_last_fire.get(agent_id) or agent_metrics.get(agent_id, {}).get(
                    "last_cron_fire", 0
                )
                # Compute the next fire AFTER the last known fire (or 65s ago).
                since = max(last, now - 65)
                next_run = compute_next_cron(expr, since=since)
                if next_run is None:
                    continue
                if next_run <= now:
                    # Skip if a process is already running — cron should not pile up
                    if agent_id in running_processes and running_processes[agent_id].alive:
                        continue
                    try:
                        await spawn_process(agent_id, agent)
                        _cron_last_fire[agent_id] = now
                        agent_metrics.setdefault(agent_id, {})["last_cron_fire"] = now
                        try:
                            st = _load_state()
                            st["running"] = list(running_processes.keys())
                            st["metrics"] = agent_metrics
                            _save_state(st)
                        except Exception:
                            logger.exception("failed to persist cron state")
                        logger.info(
                            "cron fired agent %s (expr=%s)",
                            agent.get("name", agent_id),
                            expr,
                        )
                    except Exception:
                        logger.exception(
                            "cron failed to spawn agent %s",
                            agent.get("name", agent_id),
                        )
        except asyncio.CancelledError:
            return
        except Exception:
            logger.exception("cron scheduler loop error")
            await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Restore running sessions from persisted state (non-auto_start agents too)
    state = _load_state()
    agents = load_agents()
    # Restore metrics
    if state.get("metrics"):
        for k, v in state["metrics"].items():
            agent_metrics[k] = v
    # Restore running sessions (except auto_start which we handle separately)
    running_to_restore = [aid for aid in state.get("running", []) if aid not in running_processes and aid in agents]
    running_to_restore.sort(key=lambda aid: (agents[aid].get("order", 0), agents[aid].get("name", "")))
    for agent_id in running_to_restore:
        if not agents[agent_id].get("auto_start", False):  # skip auto_start (handled below)
            try:
                await spawn_process(agent_id, agents[agent_id])
                logger.info("Restored session: %s", agent_id)
            except Exception:
                logger.warning("Failed to restore session %s", agent_id)
    # Auto-start agents: sorted by order ascending, then name, with 500ms stagger
    auto_start_agents = [
        (agent_id, agent)
        for agent_id, agent in agents.items()
        if agent.get("auto_start", False) and agent_id not in running_processes
    ]
    auto_start_agents.sort(key=lambda x: (x[1].get("order", 0), x[1].get("name", "")))
    for agent_id, agent in auto_start_agents:
        try:
            await spawn_process(agent_id, agent)
            logger.info("Auto-start [%s] order=%s: %s",
                        agent.get("name", agent_id), agent.get("order", 0), agent_id)
        except Exception:
            logger.warning("Auto-start failed for agent %s: %s", agent_id, agent.get("name", ""))
        await asyncio.sleep(0.5)
    # Start cron scheduler in the background
    cron_task = asyncio.create_task(_cron_scheduler_loop())
    logger.info("cron scheduler started")
    yield
    cron_task.cancel()
    try:
        await cron_task
    except asyncio.CancelledError:
        pass
    for agent_id in list(running_processes):
        await kill_process(agent_id)


app = FastAPI(lifespan=lifespan)

# LLM-First API layer (progressive disclosure design)
from llm_api import llm_router
app.include_router(llm_router, prefix="/api/llm", tags=["LLM"])

STATIC_DIR = "static"
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# ---------------------------------------------------------------------------
# Agent CRUD
# ---------------------------------------------------------------------------


@app.get("/api/agents")
async def get_agents():
    agents = load_agents()
    result = list(agents.values())
    for a in result:
        aid = a["id"]
        if aid in running_processes:
            h = running_processes[aid]
            a["status"] = "running" if h.alive else "exited"
            a["uptime"] = time.time() - h.started_at
            a["restart_count"] = agent_metrics.get(aid, {}).get("restart_count", 0)
        else:
            a["status"] = "stopped"
            a["uptime"] = 0
            a["restart_count"] = agent_metrics.get(aid, {}).get("restart_count", 0)
    result.sort(key=lambda a: (-a.get("pinned", False), a.get("order", 0)))
    return result


@app.post("/api/agents")
async def create_agent(agent_in: AgentCreate):
    agents = load_agents()
    agent_id = str(uuid.uuid4())
    new_agent = Agent(
        id=agent_id,
        name=agent_in.name,
        label=agent_in.label,
        directory=agent_in.directory,
        command=agent_in.command,
        env=agent_in.env,
        order=agent_in.order,
        tags=agent_in.tags or [],
        auto_start=agent_in.auto_start,
        pinned=agent_in.pinned,
        launchd_type=agent_in.launchd_type,
        launchd_interval=agent_in.launchd_interval,
        launchd_watchpath=agent_in.launchd_watchpath,
        cron_expression=agent_in.cron_expression,
    )
    agents[agent_id] = new_agent.model_dump()
    save_agents(agents)
    # Wire up launchd if requested — silently no-op for launchd_type="none"
    if new_agent.launchd_type != "none":
        _generate_launchd_plist(agent_id, agents[agent_id])
    return new_agent


@app.put("/api/agents/{agent_id}")
async def update_agent(agent_id: str, updates: AgentUpdate):
    agents = load_agents()
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent = agents[agent_id]
    prev_launchd_type = agent.get("launchd_type", "none")
    for field, value in updates.model_dump(exclude_none=True).items():
        agent[field] = value
    agents[agent_id] = agent
    save_agents(agents)
    # If launchd config changed, regenerate or remove the plist accordingly.
    new_launchd_type = agent.get("launchd_type", "none")
    automation_fields = {"launchd_type", "launchd_interval", "launchd_watchpath", "command", "directory"}
    touched_automation = bool(automation_fields & set(updates.model_dump(exclude_none=True).keys()))
    if touched_automation:
        if new_launchd_type == "none" and prev_launchd_type != "none":
            _remove_launchd_plist(agent_id)
        elif new_launchd_type != "none":
            _generate_launchd_plist(agent_id, agent)
    return agent


@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str):
    agents = load_agents()
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    await kill_process(agent_id)
    # Remove launchd plist before deleting the agent (the function is idempotent
    # — safe to call even if no plist exists).
    _remove_launchd_plist(agent_id)
    del agents[agent_id]
    save_agents(agents)
    agent_metrics.pop(agent_id, None)
    _cron_last_fire.pop(agent_id, None)
    return {"ok": True}


@app.get("/api/agents/{agent_id}/status")
async def agent_status(agent_id: str):
    agents = load_agents()
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent = agents[agent_id]
    if agent_id in running_processes:
        h = running_processes[agent_id]
        status = "running" if h.alive else "exited"
        uptime = time.time() - h.started_at
    else:
        status = "stopped"
        uptime = 0
    metrics = agent_metrics.get(agent_id, {})
    launchd_info = get_launchd_info(agent_id, agent)
    cron_expr = agent.get("cron_expression")
    next_cron = compute_next_cron(cron_expr) if cron_expr else None
    return {
        "id": agent_id,
        "status": status,
        "uptime": uptime,
        "restart_count": metrics.get("restart_count", 0),
        "cron_expression": cron_expr,
        "next_cron_run": next_cron,
        **launchd_info,
    }


@app.post("/api/agents/{agent_id}/restart")
async def restart_agent(agent_id: str):
    agents = load_agents()
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    await kill_process(agent_id)
    # Increment restart count
    if agent_id not in agent_metrics:
        agent_metrics[agent_id] = {
            "restart_count": 0,
            "total_uptime": 0.0,
            "last_started": 0,
        }
    agent_metrics[agent_id]["restart_count"] += 1
    return {"id": agent_id, "restarted": True}


@app.post("/api/agents/{agent_id}/resize")
async def resize_terminal(agent_id: str, payload: ResizePayload):
    handle = running_processes.get(agent_id)
    if handle is None:
        raise HTTPException(status_code=404, detail="No running process for agent")
    try:
        winsize = struct.pack("HHHH", payload.rows, payload.cols, 0, 0)
        fcntl.ioctl(handle.master_fd, termios.TIOCSWINSZ, winsize)
    except OSError as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"ok": True}


# ---------------------------------------------------------------------------
# Terminal output capture/export
# ---------------------------------------------------------------------------


@app.get("/api/agents/{agent_id}/scrollback")
async def get_scrollback(agent_id: str):
    """Download the current scrollback buffer as plain text."""
    agents = load_agents()
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    handle = running_processes.get(agent_id)
    if handle is None:
        return Response(content=b"", media_type="text/plain")
    content = handle.get_raw_scrollback()
    name = agents[agent_id].get("name", agent_id).replace(" ", "_")
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{name}_output.txt"'},
    )


# ---------------------------------------------------------------------------
# Bulk operations
# ---------------------------------------------------------------------------


@app.post("/api/bulk/restart")
async def bulk_restart():
    """Restart all running agents."""
    agents = load_agents()
    restarted = []
    for agent_id in list(running_processes):
        if agent_id in agents:
            await kill_process(agent_id)
            if agent_id not in agent_metrics:
                agent_metrics[agent_id] = {
                    "restart_count": 0,
                    "total_uptime": 0.0,
                    "last_started": 0,
                }
            agent_metrics[agent_id]["restart_count"] += 1
            restarted.append(agent_id)
    return {"restarted": restarted}


@app.post("/api/bulk/stop")
async def bulk_stop():
    """Stop all running agents."""
    stopped = []
    for agent_id in list(running_processes):
        await kill_process(agent_id)
        stopped.append(agent_id)
    return {"stopped": stopped}


@app.post("/api/bulk/start")
async def bulk_start():
    """Start all agents that are not running."""
    agents = load_agents()
    started = []
    for agent_id, agent in agents.items():
        if agent_id not in running_processes:
            try:
                await spawn_process(agent_id, agent)
                started.append(agent_id)
            except Exception:
                pass
    return {"started": started}


# ---------------------------------------------------------------------------
# Broadcast — send same input to multiple agents
# ---------------------------------------------------------------------------


@app.post("/api/broadcast")
async def broadcast_input(payload: BroadcastPayload):
    """Send the same input string to multiple agent PTYs."""
    sent_to = []
    for agent_id in payload.agent_ids:
        handle = running_processes.get(agent_id)
        if handle and handle.alive:
            try:
                os.write(handle.master_fd, payload.input.encode("utf-8"))
                sent_to.append(agent_id)
            except OSError:
                pass
    return {"sent_to": sent_to}


# ---------------------------------------------------------------------------
# Templates (presets)
# ---------------------------------------------------------------------------


@app.get("/api/templates")
async def get_templates():
    return list(load_templates().values())


@app.post("/api/templates")
async def create_template(tmpl: TemplateCreate):
    templates = load_templates()
    tmpl_id = str(uuid.uuid4())
    data = {
        "id": tmpl_id,
        "name": tmpl.name,
        "directory": tmpl.directory,
        "command": tmpl.command,
        "env": tmpl.env,
        "tags": tmpl.tags or [],
    }
    templates[tmpl_id] = data
    save_templates(templates)
    return data


@app.delete("/api/templates/{template_id}")
async def delete_template(template_id: str):
    templates = load_templates()
    if template_id not in templates:
        raise HTTPException(status_code=404, detail="Template not found")
    del templates[template_id]
    save_templates(templates)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Agent import/export (backup/restore)
# ---------------------------------------------------------------------------


@app.get("/api/export")
async def export_agents():
    """Export all agent configs as JSON for backup."""
    agents = load_agents()
    return Response(
        content=json.dumps(list(agents.values()), indent=2),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="agents_backup.json"'},
    )


@app.post("/api/import")
async def import_agents(agent_list: List[dict]):
    """Import agents from a backup. Skips agents with duplicate names."""
    agents = load_agents()
    existing_names = {a["name"] for a in agents.values()}
    imported = []
    for a in agent_list:
        name = a.get("name", "")
        if name in existing_names:
            continue
        agent_id = str(uuid.uuid4())
        new_agent = {
            "id": agent_id,
            "name": name,
            "directory": a.get("directory", "/tmp"),
            "command": a.get("command", "bash"),
            "env": a.get("env"),
            "order": a.get("order", 0),
            "tags": a.get("tags", []),
            "auto_start": a.get("auto_start", False),
            "pinned": a.get("pinned", False),
        }
        agents[agent_id] = new_agent
        existing_names.add(name)
        imported.append(agent_id)
    save_agents(agents)
    return {"imported": imported, "count": len(imported)}


# ---------------------------------------------------------------------------
# Tags
# ---------------------------------------------------------------------------


@app.get("/api/tags")
async def get_tags():
    """Return all unique tags used across agents."""
    agents = load_agents()
    tags = set()
    for a in agents.values():
        for t in a.get("tags", []):
            tags.add(t)
    return sorted(tags)


@app.post("/api/tags/rename")
async def rename_tag(body: dict):
    """Rename a tag across all agents that use it."""
    old_name = body.get("old_name", "").strip()
    new_name = body.get("new_name", "").strip()
    if not old_name or not new_name:
        raise HTTPException(status_code=400, detail="old_name and new_name are required")
    if old_name == new_name:
        return {"renamed": 0}
    agents = load_agents()
    renamed = 0
    for a in agents.values():
        tags = a.get("tags", [])
        if old_name in tags:
            tags = [new_name if t == old_name else t for t in tags]
            a["tags"] = tags
            renamed += 1
    save_agents(agents)
    return {"renamed": renamed, "old_name": old_name, "new_name": new_name}


# ---------------------------------------------------------------------------
# Layout presets
# ---------------------------------------------------------------------------

LAYOUTS_FILE = "layouts.json"


def _load_layouts() -> dict:
    try:
        with open(LAYOUTS_FILE) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_layouts(data: dict):
    with open(LAYOUTS_FILE, "w") as f:
        json.dump(data, f, indent=2)


class LayoutPreset(BaseModel):
    name: str
    layout: str = "auto"
    agent_order: list[str] = []
    view: str = "grid"


@app.get("/api/layouts")
async def get_layouts():
    return _load_layouts()


@app.post("/api/layouts")
async def save_layout(preset: LayoutPreset):
    layouts = _load_layouts()
    layouts[preset.name] = preset.model_dump(exclude_none=True)
    _save_layouts(layouts)
    return {"saved": preset.name}


@app.delete("/api/layouts/{name}")
async def delete_layout(name: str):
    layouts = _load_layouts()
    if name in layouts:
        del layouts[name]
        _save_layouts(layouts)
        return {"deleted": name}
    raise HTTPException(status_code=404, detail="Layout not found")


@app.delete("/api/tags/{tag_name}")
async def delete_tag(tag_name: str):
    """Remove a tag from all agents that have it."""
    agents = load_agents()
    removed = 0
    for a in agents.values():
        tags = a.get("tags", [])
        if tag_name in tags:
            tags = [t for t in tags if t != tag_name]
            a["tags"] = tags
            removed += 1
    save_agents(agents)
    return {"removed": removed, "tag_name": tag_name}


@app.get("/api/agents/{agent_id}/scrollback/stats")
async def get_scrollback_stats(agent_id: str):
    """Return scrollback buffer utilization for a running agent."""
    handle = running_processes.get(agent_id)
    if handle is None:
        raise HTTPException(status_code=404, detail="Agent not running")
    return handle.scrollback_stats()


# ---------------------------------------------------------------------------
# WebSocket terminal
# ---------------------------------------------------------------------------


@app.websocket("/ws/{agent_id}")
async def websocket_endpoint(websocket: WebSocket, agent_id: str):
    await websocket.accept()
    agents = load_agents()
    if agent_id not in agents:
        await websocket.send_json(
            {"type": "status", "status": "error", "message": "Agent not found"}
        )
        await websocket.close()
        return

    agent = agents[agent_id]

    handle = running_processes.get(agent_id)
    if handle and handle.alive:
        handle.websockets.append(websocket)
        await websocket.send_json(
            {"type": "status", "status": "connected", "reconnect": True}
        )
        clean = handle.get_clean_scrollback()
        if clean:
            try:
                await websocket.send_bytes(clean)
            except Exception:
                pass
    else:
        try:
            handle = await spawn_process(agent_id, agent)
            handle.websockets.append(websocket)
            await websocket.send_json(
                {"type": "status", "status": "connected", "reconnect": False}
            )
        except Exception as e:
            await websocket.send_json(
                {"type": "status", "status": "error", "message": str(e)}
            )
            await websocket.close()
            return

    try:
        while True:
            msg = await websocket.receive()
            if msg["type"] == "websocket.receive":
                if "text" in msg:
                    text = msg["text"]
                    if text.startswith('{"type":"resize"'):
                        try:
                            payload = json.loads(text)
                            if payload.get("type") == "resize":
                                cols = int(payload["cols"])
                                rows = int(payload["rows"])
                                winsize = struct.pack("HHHH", rows, cols, 0, 0)
                                fcntl.ioctl(
                                    handle.master_fd, termios.TIOCSWINSZ, winsize
                                )
                        except (json.JSONDecodeError, KeyError, OSError):
                            pass
                        continue
                    os.write(handle.master_fd, text.encode("utf-8"))
                elif "bytes" in msg:
                    os.write(handle.master_fd, msg["bytes"])
            elif msg["type"] == "websocket.disconnect":
                break
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if websocket in handle.websockets:
            handle.websockets.remove(websocket)
        try:
            await websocket.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Health & Launchd Status
# ---------------------------------------------------------------------------


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/performance")
async def get_performance():
    """Server-level CPU and memory stats using resource module."""
    import resource
    try:
        r = resource.getrusage(resource.RUSAGE_SELF)
        return {
            "cpu_user_s": round(r.ru_utime, 2),
            "cpu_system_s": round(r.ru_stime, 2),
            "max_rss_kb": r.ru_maxrss,
            "involuntary_ctx_switches": r.ru_nivcsw,
            "voluntary_ctx_switches": r.ru_nvcsw,
            "running_agents": len(running_processes),
            "timestamp": time.time(),
        }
    except Exception as e:
        return {"error": str(e), "running_agents": len(running_processes)}


@app.get("/api/agents/{agent_id}/launchd")
async def agent_launchd_status(agent_id: str):
    agents = load_agents()
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {
        "agent_id": agent_id,
        **get_launchd_info(agent_id, agents[agent_id]),
    }


# ---------------------------------------------------------------------------
# Automation — Cron
# ---------------------------------------------------------------------------


@app.get("/api/automation/jobs")
async def list_automation_jobs():
    """Return all automation jobs (launchd + cron) with status, schedule, next run."""
    agents = load_agents()
    jobs = []
    for agent_id, agent in agents.items():
        metrics = agent_metrics.get(agent_id, {})
        launchd_type = agent.get("launchd_type", "none")
        cron_expr = agent.get("cron_expression")

        # Launchd job (one per agent with automation)
        if launchd_type != "none":
            info = get_launchd_info(agent_id, agent)
            j = {
                "agent_id": agent_id,
                "agent_name": agent.get("name", ""),
                "automation_type": launchd_type,
                "run_count": info.get("run_count", 0),
                "status": "active" if info.get("loaded") else "inactive",
                "pid": info.get("pid"),
                "log_out": info.get("log_out"),
                "log_err": info.get("log_err"),
            }
            if launchd_type == "timer":
                j["type"] = "launchd_timer"
                j["schedule"] = f"{agent.get('launchd_interval', 3600)}s"
            elif launchd_type == "hook":
                j["type"] = "launchd_hook"
                j["schedule"] = agent.get("launchd_watchpath", "")
            elif launchd_type == "keepalive":
                j["type"] = "launchd_keepalive"
                j["schedule"] = "persistent"
            jobs.append(j)

        # Cron job (separate entry from launchd)
        if cron_expr:
            jobs.append({
                "agent_id": agent_id,
                "agent_name": agent.get("name", ""),
                "type": "cron",
                "automation_type": "cron",
                "schedule": cron_expr,
                "next_run": compute_next_cron(cron_expr),
                "last_run": metrics.get("last_started"),
                "run_count": metrics.get("restart_count", 0),
                "status": "scheduled",
            })
    return jobs


@app.post("/api/automation/{agent_id}/trigger")
async def trigger_automation(agent_id: str):
    """One-shot trigger: immediately spawn this agent's process (no persistence)."""
    agents = load_agents()
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent = agents[agent_id]
    try:
        handle = await spawn_process(agent_id, agent)
        return {"spawned": True, "pid": handle.process.pid, "uptime_start": handle.started_at}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/automation/{agent_id}/enable")
async def enable_automation(agent_id: str):
    """Load/enable the launchd plist for an agent (no regeneration)."""
    agents = load_agents()
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent = agents[agent_id]
    if agent.get("launchd_type", "none") == "none":
        raise HTTPException(status_code=400, detail="Agent has no automation configured")
    plist_path = _get_plist_path(agent_id)
    if not os.path.exists(plist_path):
        _generate_launchd_plist(agent_id, agent)
    try:
        r = subprocess.run(["launchctl", "load", plist_path], capture_output=True, timeout=10)
        if r.returncode != 0:
            raise HTTPException(status_code=500, detail=f"launchctl load failed: {r.stderr.decode(errors='replace')}")
        return {"agent_id": agent_id, "enabled": True, **get_launchd_info(agent_id, agent)}
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="launchctl load timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/automation/{agent_id}/disable")
async def disable_automation(agent_id: str):
    """Unload/disable the launchd plist for an agent (no deletion)."""
    agents = load_agents()
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    plist_path = _get_plist_path(agent_id)
    try:
        subprocess.run(["launchctl", "unload", plist_path], capture_output=True, timeout=10)
        return {"agent_id": agent_id, "disabled": True}
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="launchctl unload timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/automation/{agent_id}/logs")
async def get_automation_logs(agent_id: str):
    """Return last 100 lines of stdout and stderr logs for an agent."""
    agents = load_agents()
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    out_log, err_log = get_log_paths(agent_id)
    out_lines = []
    err_lines = []
    last_updated = None
    for path, lines in [(out_log, out_lines), (err_log, err_lines)]:
        if os.path.exists(path):
            try:
                stat = os.stat(path)
                last_updated = stat.st_mtime
                with open(path) as f:
                    all_lines = f.readlines()
                lines.extend(all_lines[-100:])
            except Exception:
                pass
    return {"out": out_lines, "err": err_lines, "last_updated": last_updated}


@app.get("/api/cron/helper")
async def cron_helper():
    """Return a map of human-readable cron presets."""
    return [
        {"label": "Every minute",    "expression": "* * * * *"},
        {"label": "Every 5 minutes",   "expression": "*/5 * * * *"},
        {"label": "Every 15 minutes",  "expression": "*/15 * * * *"},
        {"label": "Every 30 minutes",  "expression": "*/30 * * * *"},
        {"label": "Every hour",        "expression": "0 * * * *"},
        {"label": "Every 2 hours",     "expression": "0 */2 * * *"},
        {"label": "Every 6 hours",    "expression": "0 */6 * * *"},
        {"label": "Daily at midnight", "expression": "0 0 * * *"},
        {"label": "Daily at 6 AM",    "expression": "0 6 * * *"},
        {"label": "Daily at noon",    "expression": "0 12 * * *"},
        {"label": "Daily at 6 PM",    "expression": "0 18 * * *"},
        {"label": "Weekly (Sunday)",  "expression": "0 0 * * 0"},
        {"label": "Monthly (1st)",   "expression": "0 0 1 * *"},
        {"label": "Quarterly",        "expression": "0 0 1 */3 *"},
    ]


# ---------------------------------------------------------------------------
# ControlBoard endpoints — Page 1: Governance Dashboard
# ---------------------------------------------------------------------------
#
# Authority: plans/controlboard.md Step 4 + plans/ROADMAP.md §4 (ControlBoard)
# Schema:    plans/ROADMAP.md §3.E (repository_report.json fields)
# Quarantine protocol: .supercache/contracts/repo-sanitation.md §3
#
# These endpoints power the Governance Dashboard tab. They walk the user's
# drives looking for FLOYD.md-bearing projects, read each project's
# SSOT/repository_report.json if present, and aggregate quarantine state for
# the persistent ControlBoard alert.

import time
from pathlib import Path as _PathLib

_DRIVES = (_PathLib("/Volumes/SanDisk1Tb"), _PathLib("/Volumes/Storage"))
_PROJECT_WALK_EXCLUDE = frozenset({
    ".Spotlight-V100", ".fseventsd", ".Trashes", ".DocumentRevisions-V100",
    ".TemporaryItems", "node_modules", ".venv", "venv", ".git", ".supercache",
    ".pnpm-store", "__pycache__", ".pytest_cache", ".cache", "Library",
})
_T7_OFF_LIMITS = _PathLib("/Volumes/T7")  # per ~/.claude/CLAUDE.md — Time Machine target

# Read canonical .supercache version once at startup (per controlboard plan Step 4)
try:
    _CANONICAL_VERSION = _PathLib("/Volumes/SanDisk1Tb/.supercache/VERSION").read_text().strip()
except OSError:
    _CANONICAL_VERSION = "unknown"

# 30-second TTL cache for the project walk
_PROJECTS_CACHE: dict[str, object] = {"ts": 0.0, "data": None}
_QUARANTINE_CACHE: dict[str, object] = {"ts": 0.0, "data": None}
_CACHE_TTL_SECONDS = 30.0


def _walk_for_projects(drive: _PathLib) -> list[_PathLib]:
    """Find FLOYD.md-bearing projects at depth 1-2 on a drive."""
    if not drive.exists():
        return []
    if drive == _T7_OFF_LIMITS or str(drive).startswith(str(_T7_OFF_LIMITS)):
        return []
    found: list[_PathLib] = []
    try:
        for top in drive.iterdir():
            if top.name in _PROJECT_WALK_EXCLUDE or top.name.startswith("."):
                continue
            if not top.is_dir():
                continue
            # Depth-1 candidate
            if (top / "FLOYD.md").is_file():
                found.append(top)
                continue
            # Depth-2: peek inside one level
            try:
                for sub in top.iterdir():
                    if sub.name in _PROJECT_WALK_EXCLUDE or sub.name.startswith("."):
                        continue
                    if sub.is_dir() and (sub / "FLOYD.md").is_file():
                        found.append(sub)
            except (OSError, PermissionError):
                continue
    except (OSError, PermissionError):
        pass
    return found


def _project_status(proj: _PathLib, report: dict | None) -> str:
    """Determine GOVERNED / CANDIDATE / DRIFTED / UNASSESSED status."""
    if not (proj / "FLOYD.md").is_file():
        return "UNASSESSED"
    stamp_path = proj / ".floyd" / ".supercache_version"
    if stamp_path.is_file():
        try:
            stamped = stamp_path.read_text().strip()
            if stamped != _CANONICAL_VERSION and _CANONICAL_VERSION != "unknown":
                return "DRIFTED"
        except OSError:
            pass
    if not report:
        return "CANDIDATE"
    last_bootstrap = report.get("_last_verified", "")
    if last_bootstrap:
        try:
            from datetime import datetime as _dt, timezone as _tz
            ts = _dt.fromisoformat(last_bootstrap)
            age_days = (_dt.now(_tz.utc) - ts.astimezone(_tz.utc)).days
            if age_days <= 7:
                return "GOVERNED"
            return "CANDIDATE"
        except (ValueError, TypeError):
            return "CANDIDATE"
    return "CANDIDATE"


def _read_report(proj: _PathLib) -> dict | None:
    """Read SSOT/repository_report.json if present. Returns None on absence/parse error."""
    candidates = (
        proj / "SSOT" / "repository_report.json",
        proj / "SSOT" / f"{proj.name}_repository_report.json",
    )
    for path in candidates:
        if path.is_file():
            try:
                return json.loads(path.read_text())
            except (json.JSONDecodeError, OSError):
                logger.debug("repository_report.json at %s is unreadable", path)
                return None
    return None


def _scan_projects() -> list[dict]:
    """Walk all configured drives and produce the project list."""
    projects: list[dict] = []
    for drive in _DRIVES:
        for proj in _walk_for_projects(drive):
            report = _read_report(proj)
            status = _project_status(proj, report)
            projects.append({
                "name": proj.name,
                "path": str(proj),
                "drive": drive.name,
                "status": status,
                "completion_percentage": report.get("completion_percentage", 0) if report else 0,
                "tech_stack": report.get("tech_stack", []) if report else [],
                "last_bootstrap": report.get("_last_verified", "") if report else "",
                "report": report,
                "links": {
                    "floyd_md": f"file://{proj}/FLOYD.md",
                    "ssot": f"file://{proj}/SSOT",
                    "report_json": f"file://{proj}/SSOT/repository_report.json" if report else None,
                    "project_root": f"file://{proj}",
                },
            })
    # Sort: completion% desc, then last_bootstrap asc (older bootstrap loses tiebreak)
    projects.sort(key=lambda p: (-p["completion_percentage"], p["last_bootstrap"]))
    return projects


def _scan_quarantine() -> dict:
    """Aggregate .floyd/quarantine/ across the project portfolio."""
    by_project: list[dict] = []
    total = 0
    oldest = ""
    for drive in _DRIVES:
        for proj in _walk_for_projects(drive):
            qdir = proj / ".floyd" / "quarantine"
            if not qdir.is_dir():
                continue
            count = 0
            project_oldest = ""
            for date_dir in qdir.iterdir():
                if not date_dir.is_dir():
                    continue
                # Count files excluding LEDGER.jsonl and *.WHY.md companions
                for entry in date_dir.rglob("*"):
                    if entry.is_file() and not entry.name.endswith(".WHY.md") and entry.name != "LEDGER.jsonl":
                        count += 1
                if count > 0 and (not project_oldest or date_dir.name < project_oldest):
                    project_oldest = date_dir.name
            if count > 0:
                total += count
                by_project.append({
                    "name": proj.name,
                    "path": str(proj),
                    "count": count,
                    "oldest_date": project_oldest,
                    "link": f"file://{qdir}",
                })
                if not oldest or project_oldest < oldest:
                    oldest = project_oldest
    return {"total": total, "oldest_date": oldest, "by_project": by_project}


@app.get("/api/projects")
async def list_projects():
    """List every governed project with status + repository_report.json data."""
    now = time.time()
    if _PROJECTS_CACHE["data"] is not None and (now - _PROJECTS_CACHE["ts"]) < _CACHE_TTL_SECONDS:
        return {"projects": _PROJECTS_CACHE["data"], "cached": True, "canonical_version": _CANONICAL_VERSION}
    projects = _scan_projects()
    _PROJECTS_CACHE["data"] = projects
    _PROJECTS_CACHE["ts"] = now
    return {"projects": projects, "cached": False, "canonical_version": _CANONICAL_VERSION}


@app.get("/api/quarantine-summary")
async def quarantine_summary():
    """Aggregate quarantine state across the project portfolio."""
    now = time.time()
    if _QUARANTINE_CACHE["data"] is not None and (now - _QUARANTINE_CACHE["ts"]) < _CACHE_TTL_SECONDS:
        result = _QUARANTINE_CACHE["data"]
        return {**result, "cached": True}  # type: ignore[dict-item]
    result = _scan_quarantine()
    _QUARANTINE_CACHE["data"] = result
    _QUARANTINE_CACHE["ts"] = now
    return {**result, "cached": False}


# ---------------------------------------------------------------------------
# ControlBoard endpoint — Page 2: Six-Project Workspace ranking (Step 5)
# ---------------------------------------------------------------------------
#
# Authority: plans/controlboard.md Step 5
#
# GET /api/projects/top-six-active — returns the top 6 incomplete projects
# (completion% < 100), sorted by completion% desc with last_bootstrap asc as
# tiebreak (oldest bootstrap loses).


def _rank_top_six(projects: list[dict]) -> list[dict]:
    """Pure ranker — split out so tests can hit it without scanning drives."""
    incomplete = [p for p in projects if p.get("completion_percentage", 0) < 100]
    incomplete.sort(key=lambda p: (
        -p.get("completion_percentage", 0),
        p.get("last_bootstrap", "") or "",  # empty strings sort first → oldest first
    ))
    return incomplete[:6]


@app.get("/api/projects/top-six-active")
async def top_six_active():
    """Return the 6 highest-completion incomplete projects to populate the Workspace."""
    now = time.time()
    if _PROJECTS_CACHE["data"] is not None and (now - _PROJECTS_CACHE["ts"]) < _CACHE_TTL_SECONDS:
        projects = _PROJECTS_CACHE["data"]
    else:
        projects = _scan_projects()
        _PROJECTS_CACHE["data"] = projects
        _PROJECTS_CACHE["ts"] = now
    return {"projects": _rank_top_six(projects), "canonical_version": _CANONICAL_VERSION}


# ---------------------------------------------------------------------------
# ControlBoard endpoints — Page 5: Mac System Health
# ---------------------------------------------------------------------------
#
# Authority: plans/controlboard.md Step 12
# Producer:  scripts/system_scan.py (writes .floyd/system-health-cache.json)
# Consumer:  the System Health tab in index.html
#
# GET  /api/system-health         — serves cached scan; triggers a fresh scan
#                                    if the cache is older than 5 minutes
# POST /api/system-health/rescan  — synchronous re-scan with 30s wall-clock cap

import importlib.util as _importlib_util
from typing import Any as _Any

_SYSTEM_SCAN_FRESH_SECONDS = 300  # 5 minutes
_SCAN_SCRIPT_PATH = _PathLib(__file__).parent / "scripts" / "system_scan.py"
_system_scan_module: _Any = None


def _get_system_scan_module():
    """Lazy-load scripts/system_scan.py once per process.

    Python 3.14's dataclass implementation walks sys.modules during decoration
    to resolve KW_ONLY types, so the module MUST be registered in sys.modules
    BEFORE exec_module runs — otherwise the @dataclass decorators raise
    AttributeError on a None lookup.
    """
    global _system_scan_module
    if _system_scan_module is not None:
        return _system_scan_module
    if "system_scan" in sys.modules:
        _system_scan_module = sys.modules["system_scan"]
        return _system_scan_module
    spec = _importlib_util.spec_from_file_location("system_scan", _SCAN_SCRIPT_PATH)
    if spec is None or spec.loader is None:
        return None
    mod = _importlib_util.module_from_spec(spec)
    sys.modules["system_scan"] = mod
    spec.loader.exec_module(mod)
    _system_scan_module = mod
    return mod


@app.get("/api/system-health")
async def get_system_health():
    """Return the latest system health report. Refresh if stale."""
    mod = _get_system_scan_module()
    if mod is None:
        return {"error": "system_scan module not found"}
    if not mod.cache_is_fresh(_SYSTEM_SCAN_FRESH_SECONDS):
        report = mod.build_report()
        mod.write_cache(report)
    cached = mod.read_cache()
    if cached is None:
        return {"error": "scan failed and no cache exists"}
    return {**cached, "cached": True, "fresh": mod.cache_is_fresh(_SYSTEM_SCAN_FRESH_SECONDS)}


@app.post("/api/system-health/rescan")
async def rescan_system_health():
    """Synchronously re-scan and return fresh data."""
    mod = _get_system_scan_module()
    if mod is None:
        return {"error": "system_scan module not found"}
    started = time.time()
    report = mod.build_report()
    mod.write_cache(report)
    payload = json.loads(report.to_json())
    payload["wall_clock_seconds"] = round(time.time() - started, 2)
    payload["fresh"] = True
    return payload


# ---------------------------------------------------------------------------
# ControlBoard endpoints — Dual Terminal sidepanel (Step 6)
# ---------------------------------------------------------------------------
#
# Authority: plans/controlboard.md Step 6
#
# These two endpoints power the "Dual Terminal" tab — a port of the Floyd TTY
# Bridge sidepanel UI. They are thin wrappers around the existing agent
# lifecycle: each sidepanel pane spawns an ephemeral agent (tagged so the UI
# can filter), attaches to /ws/{agent_id}, and deletes on tab close.

import os as _os_for_sidepanel


class SidepanelSpawnRequest(BaseModel):
    directory: Optional[str] = None
    label: Optional[str] = None
    name_prefix: Optional[str] = None
    extra_tags: Optional[List[str]] = None


@app.post("/api/sidepanel/spawn")
async def spawn_sidepanel_agent(req: Optional[SidepanelSpawnRequest] = None):
    """Create an ephemeral sidepanel agent and start it.

    Body (all fields optional):
      directory   — working directory; defaults to $HOME
      label       — UI label; defaults to "Dual Terminal"
      name_prefix — agent name prefix; defaults to "sidepanel"
      extra_tags  — additional tags (the 'ephemeral' and 'sidepanel' tags
                    are always applied)

    Returns {agent_id, name, shell, directory}. The frontend then opens
    /ws/{agent_id}. The caller MUST DELETE the agent when its terminal
    pane closes — these are not auto-reaped.
    """
    agents = load_agents()
    agent_id = str(uuid.uuid4())
    short = agent_id[:8]
    home = _os_for_sidepanel.environ.get("HOME", "/tmp")
    shell = _os_for_sidepanel.environ.get("SHELL", "/bin/zsh")
    req = req or SidepanelSpawnRequest()
    directory = req.directory or home
    if not _PathLib(directory).is_dir():
        directory = home  # fall back silently rather than refuse
    label = req.label or "Dual Terminal"
    name_prefix = req.name_prefix or "sidepanel"
    base_tags = ["ephemeral", "sidepanel"]
    if req.extra_tags:
        for t in req.extra_tags:
            if t not in base_tags:
                base_tags.append(t)
    new_agent = Agent(
        id=agent_id,
        name=f"{name_prefix}-{short}",
        label=label,
        directory=directory,
        command=shell,
        env={},
        order=9999,  # sink to bottom of normal sidebar
        tags=base_tags,
        auto_start=True,
        pinned=False,
        launchd_type="none",
        launchd_interval=3600,
        launchd_watchpath="",
        cron_expression=None,
    )
    agents[agent_id] = new_agent.model_dump()
    save_agents(agents)
    # Start the PTY immediately so the WebSocket connect is hot.
    try:
        await spawn_process(agent_id, agents[agent_id])
    except Exception as exc:  # pragma: no cover — defensive
        logger.warning("sidepanel spawn_process failed: %s", exc)
    return {"agent_id": agent_id, "name": new_agent.name, "shell": shell, "directory": directory}


@app.delete("/api/sidepanel/{agent_id}")
async def delete_sidepanel_agent(agent_id: str):
    """Tear down an ephemeral sidepanel agent. Refuses to delete non-sidepanel agents."""
    agents = load_agents()
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    tags = agents[agent_id].get("tags") or []
    if "sidepanel" not in tags:
        raise HTTPException(status_code=400, detail="Refusing to delete non-sidepanel agent via this endpoint")
    await kill_process(agent_id)
    _remove_launchd_plist(agent_id)
    del agents[agent_id]
    save_agents(agents)
    agent_metrics.pop(agent_id, None)
    _cron_last_fire.pop(agent_id, None)
    return {"ok": True, "agent_id": agent_id}


# ---------------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------------


@app.get("/")
async def serve_index():
    return FileResponse("index.html")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10527)))
