# Terminal Control Center — LLM Quick Start Guide

## What This Is

Terminal Control Center (TCC) exposes a single API endpoint that lets any LLM manage terminal sessions. One endpoint, simple actions, plain English responses.

**Endpoint:** `POST http://localhost:9527/api/llm/do`

**Actions:** list, read, run, stop, start, cancel, answer

---

## Setup

1. TCC must be running on port 9527
2. Your LLM needs the ability to make HTTP calls (tool use / function calling)
3. Give your model the tool definition and system prompt from the appropriate tier below

---

## Tier 1: Small Models (3–9B parameters)

Models: Qwen 2.5 3B, Gemma 3 4B, Phi-3 Mini, Llama 3.2 3B, Mistral 7B

These models need explicit instruction to use the tool and benefit from the simplest possible schema.

### System Prompt (copy this exactly)

```
You are a helpful assistant. You have access to a terminal_control tool.
When the user asks anything about terminals, running commands, checking output, or managing processes — always use the terminal_control tool.
Do not describe what you would do. Use the tool.
```

### Tool Definition (JSON Schema)

```json
{
  "type": "function",
  "function": {
    "name": "terminal_control",
    "description": "Send commands to terminals and read their output.",
    "parameters": {
      "type": "object",
      "required": ["action"],
      "properties": {
        "action": {
          "type": "string",
          "description": "What to do. One of: list, read, run, stop, start, cancel, answer",
          "enum": ["list", "read", "run", "stop", "start", "cancel", "answer"]
        },
        "agent": {
          "type": "string",
          "description": "Which terminal to act on (use the agent name)"
        },
        "input": {
          "type": "string",
          "description": "Command or text to send to the terminal"
        }
      }
    }
  }
}
```

### Tips for Small Models

- Use direct phrasing: "Run X on Y" works better than "Could you execute X in Y"
- One instruction per message — avoid compound requests
- If the model responds with text instead of a tool call, rephrase: "Use the terminal_control tool to..."
- The response `hint` field tells the model what to do next — include it in follow-up context

### Example Prompts That Work at This Tier

```
Show me what terminals are available.
Run echo hello on demo-shell.
Read the output from demo-shell.
Stop demo-shell.
Start demo-shell.
Cancel whatever demo-shell is doing.
Answer yes on demo-shell.
```

---

## Tier 2: Average Models (10–70B parameters)

Models: Llama 3.1 70B, Qwen 2.5 32B, Mixtral 8x22B, Command R+, Gemma 3 27B

These models handle natural phrasing and can follow multi-step workflows using the response hints.

### System Prompt (copy this exactly)

```
You are a helpful assistant with access to terminal management via the terminal_control tool.

Use it whenever the user asks about terminals, processes, commands, or output.

The tool returns a response with:
- "output" — the terminal's text output
- "status" — one of: ready, busy, waiting_for_input, error, stopped
- "hint" — what to do next
- "actions_available" — what you can do right now

Follow the hints to guide your next action. When status is "waiting_for_input", use action "answer" to respond to the terminal's prompt.
```

### Tool Definition (JSON Schema)

```json
{
  "type": "function",
  "function": {
    "name": "terminal_control",
    "description": "Manage terminal sessions. Send commands, read output, start/stop processes, and respond to prompts. Always returns clean text output with status and guidance.",
    "parameters": {
      "type": "object",
      "required": ["action"],
      "properties": {
        "action": {
          "type": "string",
          "description": "What to do. One of: list, read, run, stop, start, cancel, answer",
          "enum": ["list", "read", "run", "stop", "start", "cancel", "answer"]
        },
        "agent": {
          "type": "string",
          "description": "Which terminal to act on (use the agent name)"
        },
        "input": {
          "type": "string",
          "description": "Command or text to send to the terminal"
        },
        "wait_until": {
          "type": "string",
          "description": "Optional: text to wait for before returning (e.g., 'Server started')"
        },
        "timeout": {
          "type": "integer",
          "description": "Optional: max seconds to wait (default 5, max 300)"
        },
        "lines": {
          "type": "integer",
          "description": "Optional: number of output lines to return (default 50)"
        }
      }
    }
  }
}
```

### Tips for Average Models

- These models handle synonyms fine: "execute", "check", "kill", "show me" all work
- Compound requests work: "Start demo-shell and run the tests"
- They can follow `hint` fields across multiple turns to complete workflows
- Add `wait_until` when you know what success looks like: "Run npm start and wait until 'Listening on port'"
- Add `timeout` for long builds: "Run make build with a 60 second timeout"

### Example Prompts That Work at This Tier

```
What's happening across all my terminals?
Start the web server and run npm start on it.
Check if the database terminal has any errors.
The build terminal is asking for a password — enter 'admin123'.
Run the test suite on test-runner and wait until it says 'All tests passed'.
Stop everything that's running.
```

---

## Tier 3: Frontier Models (70B+ / API models)

Models: Claude (Opus, Sonnet), GPT-4o, Gemini Pro/Ultra, Llama 3.1 405B, DeepSeek V3

These models can use the full progressive disclosure features and orchestrate complex multi-terminal workflows.

### System Prompt (copy this exactly)

```
You have access to a terminal_control tool for managing terminal sessions.

Actions: list, read, run, stop, start, cancel, answer

Every response includes:
- "ok" — success/failure boolean
- "output" — clean text (ANSI stripped)
- "status" — ready | busy | waiting_for_input | error | stopped
- "hint" — plain English next step
- "actions_available" — valid actions for current state
- "tip" — (optional) suggestion for advanced usage

Advanced options (use when appropriate):
- "wait_until": text to wait for before returning (useful for servers, builds)
- "timeout": max seconds (default 5; set higher for builds/installs)
- "lines": output lines to return (default 50; increase for verbose output)
- "include_advanced": true — adds elapsed_ms, pid, scrollback_bytes, uptime to response

Workflow patterns:
- Start a service → use wait_until to confirm it's ready → then proceed
- Long build → set timeout: 120 and wait_until the success message
- Stuck process → cancel, then read to see where it stopped
- Multiple terminals → list first, then act on each by name
```

### Tool Definition (JSON Schema)

```json
{
  "type": "function",
  "function": {
    "name": "terminal_control",
    "description": "Manage terminal sessions. Single endpoint for all terminal operations. Returns clean text output with semantic state, guidance hints, and optional advanced metadata. Supports progressive disclosure — add optional fields for finer control.",
    "parameters": {
      "type": "object",
      "required": ["action"],
      "properties": {
        "action": {
          "type": "string",
          "description": "What to do. One of: list, read, run, stop, start, cancel, answer",
          "enum": ["list", "read", "run", "stop", "start", "cancel", "answer"]
        },
        "agent": {
          "type": "string",
          "description": "Which terminal to act on (use the agent name)"
        },
        "input": {
          "type": "string",
          "description": "Command or text to send"
        },
        "wait_until": {
          "type": "string",
          "description": "Text to wait for in output before returning. Case-insensitive match. Useful for confirming servers started, builds completed, etc."
        },
        "timeout": {
          "type": "integer",
          "description": "Max seconds to wait (1-300). Default: 5 for commands, 30 when wait_until is set."
        },
        "lines": {
          "type": "integer",
          "description": "Number of output lines to return (1-1000). Default: 50."
        },
        "include_advanced": {
          "type": "boolean",
          "description": "When true, response includes 'advanced' block with elapsed_ms, process_pid, scrollback_bytes, uptime_seconds, matched_text."
        }
      }
    }
  }
}
```

### Tips for Frontier Models

- Use `include_advanced: true` when debugging timing or process health
- Chain operations: list → start → run (with wait_until) → read → stop
- Set `wait_until` to the expected success string for reliable sequencing
- For builds: `{"action": "run", "agent": "build", "input": "make all", "wait_until": "Build complete", "timeout": 120}`
- When the response shows `status: "error"`, read the full output with `lines: 200` to get context
- The `tip` field in responses suggests optimizations — follow them

### Example Prompts That Work at This Tier

```
Start the database, wait for "ready to accept connections", then start the API server and wait for "listening on port 3000", then run the integration tests.

Deploy to staging: run the deploy script on the deploy terminal with a 120 second timeout, waiting for "Deploy complete". If it shows an error, read the last 200 lines and tell me what went wrong.

I need to debug why the worker is crashing. Start it with include_advanced so I can see the PID, then watch the output. If it crashes, read the full scrollback.

Run the migration on db-terminal and answer 'yes' when it asks for confirmation. Wait until it says 'Migration complete'.
```

---

## Quick Reference Card

| I want to... | Action | Required fields |
|---|---|---|
| See all terminals | `list` | — |
| Read terminal output | `read` | `agent` |
| Run a command | `run` | `agent`, `input` |
| Stop a terminal | `stop` | `agent` |
| Start a terminal | `start` | `agent` |
| Interrupt (Ctrl+C) | `cancel` | `agent` |
| Reply to a prompt | `answer` | `agent`, `input` |

## Response Status Values

| Status | Meaning | What to do |
|---|---|---|
| `ready` | Terminal is idle, waiting for commands | Send a command with `run` |
| `busy` | Process is actively producing output | Wait, or use `read` to check progress |
| `waiting_for_input` | Terminal is asking a question | Use `answer` to respond |
| `error` | Last command produced an error | Use `read` to see the error details |
| `stopped` | Process is not running | Use `start` to launch it |

---

## Integration Examples

### cURL (for testing)

```bash
# List terminals
curl -s http://localhost:9527/api/llm/do \
  -H "Content-Type: application/json" \
  -d '{"action": "list"}'

# Run a command
curl -s http://localhost:9527/api/llm/do \
  -H "Content-Type: application/json" \
  -d '{"action": "run", "agent": "my-terminal", "input": "echo hello"}'

# Run with wait_until (for capable models)
curl -s http://localhost:9527/api/llm/do \
  -H "Content-Type: application/json" \
  -d '{"action": "run", "agent": "server", "input": "npm start", "wait_until": "Listening on port", "timeout": 15}'
```

### Python (for custom harnesses)

```python
import requests

def terminal_do(action, agent=None, input=None, **kwargs):
    payload = {"action": action}
    if agent: payload["agent"] = agent
    if input: payload["input"] = input
    payload.update(kwargs)
    resp = requests.post("http://localhost:9527/api/llm/do", json=payload)
    return resp.json()

# Usage
result = terminal_do("run", agent="my-shell", input="ls -la")
print(result["output"])
print(result["hint"])
```

### MCP Server (for Claude Code / Cursor / etc.)

The endpoint at `/openapi.json` provides the full OpenAPI 3.1 spec. Any MCP-compatible harness can auto-generate tool definitions from it:

```
http://localhost:9527/openapi.json
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Model responds with text instead of tool call | Rephrase: "Use the terminal_control tool to..." |
| "Agent not found" error | The response tells you available names — check spelling |
| Command seems to hang | Default timeout is 5s. Add `"timeout": 30` for slow commands |
| Output is truncated | Add `"lines": 200` (or up to 1000) |
| Status is always "busy" | The command hasn't finished. Add `"wait_until"` with expected output |
| Model uses wrong action | The response `actions_available` field shows valid options — include it in context |
