"""Terminal output state detection and hint generation.

Analyzes scrollback text to determine semantic terminal state
and generate plain-English hints for LLM consumers.
"""

import re
import time


# --- Terminal States (plain words, no jargon) ---

STATES = ("ready", "busy", "waiting_for_input", "error", "stopped")

# --- Pattern banks ---

# Shell prompts that indicate "ready for a command"
PROMPT_PATTERNS = [
    r"[\$#%>]\s*$",
    r"\w+@[\w\-\.]+:[^\n]*[\$#]\s*$",
    r"\([\w\-]+\)\s*[\$#%>]\s*$",
    r">>>\s*$",
    r"In \[\d+\]:\s*$",
    r"irb\(\w+\):\d+:\d+>\s*$",
    r"mysql>\s*$",
    r"postgres[=#]>\s*$",
]

# Terminal is asking the user a question
INPUT_PROMPT_PATTERNS = [
    r"\[y/n\]\s*[:\?]?\s*$",
    r"\[Y/n\]\s*$",
    r"\[yes/no\]\s*$",
    r"[Pp]assword\s*:\s*$",
    r"passphrase.*:\s*$",
    r"Enter .*:\s*$",
    r"Press .* to continue",
    r"Continue\?\s*",
    r"Are you sure",
    r"\(y/N\)\s*$",
    r"Username:\s*$",
    r"Login:\s*$",
    r"Overwrite.*\?\s*",
    r"Proceed\?\s*",
]

# Output contains error indicators
ERROR_PATTERNS = [
    r"^(Error|ERROR|error):",
    r"^(Fatal|FATAL|fatal):",
    r"^Traceback \(most recent call last\)",
    r"^panic:",
    r"command not found",
    r"No such file or directory",
    r"Permission denied",
    r"^npm ERR!",
    r"^SyntaxError:",
    r"^TypeError:",
    r"^ModuleNotFoundError:",
    r"FAILED",
    r"^Exception",
    r"exit code [1-9]",
]


def strip_ansi(text: str) -> str:
    """Remove all ANSI escape sequences from text."""
    text = re.sub(r"\x1b\[[0-9;]*[a-zA-Z]", "", text)
    text = re.sub(r"\x1b\][^\x07]*\x07", "", text)
    text = re.sub(r"\x1b[()][0-9A-B]", "", text)
    text = re.sub(r"\r", "", text)
    return text


def detect_state(
    scrollback_text: str,
    process_alive: bool,
    last_output_time: float,
    current_time: float | None = None,
) -> str:
    """Determine semantic terminal state from scrollback content.

    Returns one of: ready, busy, waiting_for_input, error, stopped
    """
    if not process_alive:
        return "stopped"

    if current_time is None:
        current_time = time.time()

    lines = scrollback_text.rstrip("\n").split("\n")
    last_line = lines[-1] if lines else ""

    # Check for input prompts first (highest priority)
    for pattern in INPUT_PROMPT_PATTERNS:
        if re.search(pattern, last_line, re.IGNORECASE):
            return "waiting_for_input"

    # Check for errors in recent output (last 20 lines)
    recent = "\n".join(lines[-20:]) if len(lines) > 20 else "\n".join(lines)
    has_error = False
    for pattern in ERROR_PATTERNS:
        if re.search(pattern, recent, re.MULTILINE):
            has_error = True
            break

    # Check for idle shell prompt
    at_prompt = False
    for pattern in PROMPT_PATTERNS:
        if re.search(pattern, last_line):
            at_prompt = True
            break

    if has_error and at_prompt:
        return "error"

    if at_prompt:
        return "ready"

    # If output was very recent, terminal is busy
    age = current_time - last_output_time
    if age < 2.0:
        return "busy"

    # If output stopped but no recognized prompt, still likely idle
    if age > 5.0:
        return "ready"

    return "busy"


def generate_hint(state: str, agent_name: str, last_line: str = "") -> str:
    """Generate a plain English hint based on current state."""
    if state == "ready":
        return f"'{agent_name}' is idle and waiting for commands."
    elif state == "busy":
        return f"'{agent_name}' is running. Output is still being produced."
    elif state == "waiting_for_input":
        prompt_text = last_line.strip()[-60:] if last_line.strip() else "something"
        return f"'{agent_name}' is asking a question: {prompt_text}. Use action 'answer' to respond."
    elif state == "error":
        return f"'{agent_name}' encountered an error. Use action 'read' to see the full output."
    elif state == "stopped":
        return f"'{agent_name}' is not running. Use action 'start' to launch it."
    return f"'{agent_name}' state is unknown."


def generate_tip(state: str, action: str, elapsed_ms: int = 0, truncated: bool = False) -> str | None:
    """Generate an optional tip for capable models. Returns None if no tip is relevant."""
    if action == "run" and elapsed_ms > 4000:
        return "This command took a while. Add 'timeout': 30 for longer-running commands."
    if action == "read" and truncated:
        return "Output was truncated. Add 'lines': 200 to get more."
    if action == "run" and state == "busy":
        return "Command is still running. Add 'wait_until': 'some text' to wait for specific output."
    return None
