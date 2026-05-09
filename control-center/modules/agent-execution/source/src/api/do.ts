/**
 * POST /api/do — the single agent endpoint with progressive disclosure.
 *
 * Tier 1 (3-9B models): action, session, input → ok, output, status, hint, actions
 * Tier 2 (10-70B):      + wait_until, timeout, lines
 * Tier 3 (70B+):        + output_mode, include_marks, include_advanced
 */
import type { Context } from "hono";
import type { SessionManager, SessionWithState } from "../session/manager.js";
import type { DistillMode } from "../intel/distill.js";
import { notifySessionCreated, notifySessionDeleted } from "./ws.js";
import { setTimeout as delay } from "node:timers/promises";
import { getBridgeClient } from "../bridge/anvil-client.js";

type Action =
  | "list" | "read" | "run" | "stop" | "start" | "cancel" | "answer"
  | "create" | "delete" | "note" | "search" | "broadcast" | "history"
  | "checkpoint" | "record" | "verify" | "batch" | "bridge" | "automate";

interface DoRequest {
  action: Action;
  session?: string;
  input?: string;

  // Tier 2
  wait_until?: string;
  timeout?: number;
  lines?: number;

  // Tier 3
  output_mode?: DistillMode;
  include_marks?: boolean;
  include_advanced?: boolean;

  // Create-specific
  command?: string;
  directory?: string;
  tags?: string[];
  auto_start?: boolean;

  // Broadcast-specific
  sessions?: string[];

  // Automate-specific
  cron_expression?: string;
}

const VALID_ACTIONS = new Set<string>([
  "list", "read", "run", "stop", "start", "cancel", "answer",
  "create", "delete", "note", "search", "broadcast", "history",
  "checkpoint", "record", "verify", "batch", "bridge", "automate",
]);

function hint(session: SessionWithState | undefined): string {
  if (!session) return "Session not found.";
  switch (session.status) {
    case "ready": return "Session is ready for commands.";
    case "busy": return "Session is running a command. Wait or cancel.";
    case "waiting_for_input": return `Session is waiting for input: ${session.stateResult.detail}`;
    case "error": return `Session has an error: ${session.stateResult.detail}`;
    case "stopped": return "Session is stopped. Start it first.";
    case "exited": return "Session process has exited. Restart it.";
    case "starting": return "Session is starting up.";
    default: return "Unknown state.";
  }
}

function availableActions(session: SessionWithState | undefined): Action[] {
  if (!session) return ["list", "create"];
  switch (session.status) {
    case "ready": return ["run", "read", "stop", "cancel", "note", "history"];
    case "busy": return ["read", "cancel", "stop", "note"];
    case "waiting_for_input": return ["answer", "read", "cancel", "stop", "note"];
    case "error": return ["read", "run", "stop", "cancel", "note", "history"];
    case "stopped": return ["start", "delete", "note", "history"];
    case "exited": return ["start", "delete", "read", "note", "history"];
    case "starting": return ["read", "stop", "note"];
    default: return ["list"];
  }
}

export function createDoHandler(mgr: SessionManager) {
  return async (c: Context) => {
    let body: DoRequest;
    try {
      body = await c.req.json<DoRequest>();
    } catch {
      return c.json({ ok: false, error: "invalid JSON body" }, 400);
    }

    const { action } = body;
    if (!action || !VALID_ACTIONS.has(action)) {
      return c.json({
        ok: false,
        error: `invalid action: ${action}. Valid: ${[...VALID_ACTIONS].join(", ")}`,
      }, 400);
    }

    try {
      switch (action) {
        case "list": return handleList(c, mgr, body);
        case "read": return handleRead(c, mgr, body);
        case "run": return handleRun(c, mgr, body);
        case "stop": return handleStop(c, mgr, body);
        case "start": return handleStart(c, mgr, body);
        case "cancel": return handleCancel(c, mgr, body);
        case "answer": return handleRun(c, mgr, body); // answer = run with input
        case "create": return handleCreate(c, mgr, body);
        case "delete": return handleDelete(c, mgr, body);
        case "note": return handleNote(c, mgr, body);
        case "search": return handleSearch(c, mgr, body);
        case "broadcast": return handleBroadcast(c, mgr, body);
        case "history": return handleHistory(c, mgr, body);
        case "checkpoint": return handleCheckpoint(c, mgr, body);
        case "record": return handleRecord(c, mgr, body);
        case "verify": return handleVerify(c, mgr, body);
        case "batch": return handleBatch(c, mgr, body);
        case "bridge": return handleBridge(c, body);
        case "automate": return handleAutomate(c, mgr, body);
        default: return c.json({ ok: false, error: "not implemented" }, 501);
      }
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function handleList(c: Context, mgr: SessionManager, body: DoRequest) {
  const sessions = mgr.list().map((s) => ({
    id: s.id,
    name: s.name,
    label: s.label,
    status: s.status,
    tags: s.tags,
    pid: s.pid,
    ...(body.include_advanced ? {
      order: s.order,
      pinned: s.pinned,
      autoStart: s.autoStart,
      startedAt: s.startedAt,
      restartCount: s.restartCount,
      stateResult: s.stateResult,
    } : {}),
  }));

  return c.json({
    ok: true,
    sessions,
    hint: `${sessions.length} session(s). ${sessions.filter((s) => s.status === "ready").length} ready.`,
    actions: ["create", "read", "run", "start", "stop"],
  });
}

function handleRead(c: Context, mgr: SessionManager, body: DoRequest) {
  if (!body.session) return c.json({ ok: false, error: "session required" }, 400);
  const session = mgr.get(body.session);
  if (!session) return c.json({ ok: false, error: `session not found: ${body.session}` }, 404);

  const mode: DistillMode = body.output_mode ?? "clean";
  const output = mgr.read(session.id, mode, {
    consumerId: "api",
    maxLines: body.lines ?? 50,
  });

  return c.json({
    ok: true,
    output: output.content,
    status: session.status,
    hint: hint(session),
    actions: availableActions(session),
    ...(body.include_marks ? { marks: mgr.marks(session.id) } : {}),
    ...(body.include_advanced ? {
      reduction_pct: output.reductionPct,
      original_bytes: output.originalBytes,
      distilled_bytes: output.distilledBytes,
      state_result: session.stateResult,
    } : {}),
  });
}

/** Event-driven wait for session to reach a terminal state. Replaces polling loops. */
function waitForState(
  mgr: SessionManager,
  sessionId: string,
  terminalStates: string[],
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve) => {
    const s = mgr.get(sessionId);
    if (s && terminalStates.includes(s.status)) { resolve(); return; }

    const timer = setTimeout(() => { mgr.off("state", handler); resolve(); }, timeoutMs);

    const handler = (id: string, result: any) => {
      if (id !== sessionId) return;
      if (terminalStates.includes(result.state)) {
        clearTimeout(timer);
        mgr.off("state", handler);
        resolve();
      }
    };
    mgr.on("state", handler);
  });
}

async function handleRun(c: Context, mgr: SessionManager, body: DoRequest) {
  if (!body.session) return c.json({ ok: false, error: "session required" }, 400);
  if (!body.input) return c.json({ ok: false, error: "input required" }, 400);

  const session = mgr.get(body.session);
  if (!session) return c.json({ ok: false, error: `session not found: ${body.session}` }, 404);

  if (session.status === "stopped" || session.status === "exited") {
    mgr.start(session.id);
    await delay(1000); // Wait for shell to initialize
  }

  mgr.write(session.id, body.input);

  // Tier 2: wait_until pattern
  const timeoutMs = (body.timeout ?? 30) * 1000;
  const waitPattern = body.wait_until;
  const startTime = Date.now();
  let waitMatched = false;

  if (waitPattern) {
    const re = new RegExp(waitPattern, "i");
    while (Date.now() - startTime < timeoutMs) {
      await delay(500);
      const current = mgr.read(session.id, "clean", { consumerId: "_wait" });
      if (re.test(current.content)) {
        waitMatched = true;
        break;
      }
      // Also break if session returned to ready/error state
      const s = mgr.get(session.id);
      if (s && (s.status === "ready" || s.status === "error" || s.status === "exited")) {
        break;
      }
    }
  } else {
    // No wait pattern — event-driven wait for terminal state
    await waitForState(mgr, session.id, ["ready", "error", "exited"], Math.min(timeoutMs, 10_000));
  }

  // Read result
  const mode: DistillMode = body.output_mode ?? "clean";
  const output = mgr.read(session.id, mode, {
    consumerId: "api",
    maxLines: body.lines ?? 50,
  });

  const updated = mgr.get(session.id)!;

  return c.json({
    ok: true,
    output: output.content,
    status: updated.status,
    hint: hint(updated),
    actions: availableActions(updated),
    ...(waitPattern ? { wait_matched: waitMatched, timed_out: !waitMatched && Date.now() - startTime >= timeoutMs } : {}),
    ...(body.include_marks ? { marks: mgr.marks(session.id) } : {}),
    ...(body.include_advanced ? {
      reduction_pct: output.reductionPct,
      state_result: updated.stateResult,
      pid: updated.pid,
      uptime: updated.startedAt ? Date.now() - updated.startedAt : null,
      restart_count: updated.restartCount,
    } : {}),
  });
}

function handleStop(c: Context, mgr: SessionManager, body: DoRequest) {
  if (!body.session) return c.json({ ok: false, error: "session required" }, 400);
  mgr.stop(body.session);
  return c.json({ ok: true, status: "stopped", hint: "Session stopped.", actions: ["start", "delete"] });
}

function handleStart(c: Context, mgr: SessionManager, body: DoRequest) {
  if (!body.session) return c.json({ ok: false, error: "session required" }, 400);
  mgr.start(body.session);
  const session = mgr.get(body.session);
  return c.json({ ok: true, status: "starting", hint: "Session starting.", actions: availableActions(session) });
}

function handleCancel(c: Context, mgr: SessionManager, body: DoRequest) {
  if (!body.session) return c.json({ ok: false, error: "session required" }, 400);
  mgr.cancel(body.session);
  return c.json({ ok: true, hint: "Sent Ctrl+C.", actions: ["read", "run"] });
}

function handleCreate(c: Context, mgr: SessionManager, body: DoRequest) {
  if (!body.session) return c.json({ ok: false, error: "session (name) required" }, 400);
  if (!body.command) return c.json({ ok: false, error: "command required" }, 400);

  const session = mgr.create({
    name: body.session,
    command: body.command,
    directory: body.directory ?? process.cwd(),
    tags: body.tags,
    autoStart: body.auto_start,
  }, body.auto_start);

  notifySessionCreated({ id: session.id, name: session.name, status: session.status });
  return c.json({
    ok: true,
    id: session.id,
    status: session.status,
    hint: body.auto_start ? "Session created and started." : "Session created. Start it when ready.",
    actions: availableActions(mgr.get(session.id)),
  });
}

function handleDelete(c: Context, mgr: SessionManager, body: DoRequest) {
  if (!body.session) return c.json({ ok: false, error: "session required" }, 400);
  const deleted = mgr.delete(body.session);
  if (deleted) notifySessionDeleted(body.session);
  return c.json({ ok: deleted, hint: deleted ? "Session deleted." : "Session not found.", actions: ["list", "create"] });
}

function handleNote(c: Context, mgr: SessionManager, body: DoRequest) {
  if (!body.session) return c.json({ ok: false, error: "session required" }, 400);
  const session = mgr.get(body.session);
  if (!session) return c.json({ ok: false, error: `session not found: ${body.session}` }, 404);

  if (body.input !== undefined) {
    mgr.update(session.id, { scratchpad: body.input });
    return c.json({ ok: true, hint: "Scratchpad updated." });
  }

  return c.json({ ok: true, scratchpad: session.scratchpad, hint: "Current scratchpad contents." });
}

function handleSearch(c: Context, mgr: SessionManager, body: DoRequest) {
  if (!body.input) return c.json({ ok: false, error: "input (search query) required" }, 400);

  const re = new RegExp(body.input, "i");
  const results: Array<{ session: string; matches: string[] }> = [];

  for (const session of mgr.list()) {
    try {
      const output = mgr.read(session.id, "clean");
      const lines = output.content.split("\n").filter((l) => re.test(l));
      if (lines.length > 0) {
        results.push({ session: session.name, matches: lines.slice(0, 10) });
      }
    } catch (err) {
      console.error("[aterm] search read failed for session:", session.id, err);
    }
  }

  return c.json({
    ok: true,
    results,
    hint: `Found matches in ${results.length} session(s).`,
  });
}

function handleBroadcast(c: Context, mgr: SessionManager, body: DoRequest) {
  if (!body.input) return c.json({ ok: false, error: "input required" }, 400);
  const targets = body.sessions ?? mgr.list().filter((s) => s.status === "ready").map((s) => s.name);

  let sent = 0;
  for (const name of targets) {
    try {
      mgr.write(name, body.input);
      sent++;
    } catch (err) {
      console.error("[aterm] broadcast write failed for:", name, err);
    }
  }

  return c.json({ ok: true, sent, total: targets.length, hint: `Broadcast to ${sent}/${targets.length} sessions.` });
}

function handleHistory(c: Context, mgr: SessionManager, body: DoRequest) {
  if (!body.session) return c.json({ ok: false, error: "session required" }, 400);
  const history = mgr.history(body.session, body.lines ?? 50);
  return c.json({ ok: true, history, hint: `${history.length} commands in history.` });
}

// ---------------------------------------------------------------------------
// Checkpoint & Recording handlers
// ---------------------------------------------------------------------------

function handleCheckpoint(c: Context, mgr: SessionManager, body: DoRequest) {
  if (!body.session) return c.json({ ok: false, error: "session required" }, 400);
  const session = mgr.get(body.session);
  if (!session) return c.json({ ok: false, error: `session not found: ${body.session}` }, 404);

  // input = checkpoint name for save, or checkpoint ID for restore
  const sub = body.input ?? "save";

  if (sub === "list") {
    const checkpoints = mgr.listCheckpoints(session.id);
    return c.json({ ok: true, checkpoints, hint: `${checkpoints.length} checkpoint(s).` });
  }

  if (sub.startsWith("restore:")) {
    const cpId = sub.replace("restore:", "").trim();
    const success = mgr.restoreCheckpoint(session.id, cpId);
    return c.json({
      ok: success,
      hint: success ? "Checkpoint restored. Session restarted with saved state." : "Checkpoint not found.",
    });
  }

  // Default: save a new checkpoint
  const name = sub === "save" ? `checkpoint-${Date.now()}` : sub;
  const cpId = mgr.saveCheckpoint(session.id, name);
  return c.json({ ok: true, checkpoint_id: cpId, name, hint: `Checkpoint '${name}' saved.` });
}

function handleRecord(c: Context, mgr: SessionManager, body: DoRequest) {
  if (!body.session) return c.json({ ok: false, error: "session required" }, 400);
  const session = mgr.get(body.session);
  if (!session) return c.json({ ok: false, error: `session not found: ${body.session}` }, 404);

  const sub = body.input ?? "start";

  if (sub === "start") {
    const name = `recording-${Date.now()}`;
    const recId = mgr.startRecording(session.id, name);
    return c.json({ ok: true, recording_id: recId, name, hint: "Recording started." });
  }

  if (sub.startsWith("stop:")) {
    const recId = sub.replace("stop:", "").trim();
    mgr.stopRecording(recId);
    return c.json({ ok: true, hint: "Recording stopped." });
  }

  if (sub === "list") {
    const recordings = mgr.listRecordings(session.id);
    return c.json({ ok: true, recordings, hint: `${recordings.length} recording(s).` });
  }

  if (sub.startsWith("get:")) {
    const recId = sub.replace("get:", "").trim();
    const recording = mgr.getRecording(recId);
    return c.json({ ok: !!recording, recording, hint: recording ? "Recording retrieved." : "Recording not found." });
  }

  return c.json({ ok: false, error: "input must be: start, stop:<id>, list, or get:<id>" }, 400);
}

// ---------------------------------------------------------------------------
// Verify & Batch
// ---------------------------------------------------------------------------

async function handleVerify(c: Context, mgr: SessionManager, body: DoRequest) {
  if (!body.session) return c.json({ ok: false, error: "session required" }, 400);
  if (!body.input) return c.json({ ok: false, error: "input (verification command) required" }, 400);

  const session = mgr.get(body.session);
  if (!session) return c.json({ ok: false, error: `session not found: ${body.session}` }, 404);

  // Auto-start if needed
  if (session.status === "stopped" || session.status === "exited") {
    mgr.start(session.id);
    await delay(1000);
  }

  // Run the verification command
  mgr.write(session.id, body.input);

  // Wait for completion
  // Wait for completion — event-driven
  await waitForState(mgr, session.id, ["ready", "error", "exited"], (body.timeout ?? 60) * 1000);

  // Read output and determine pass/fail
  const output = mgr.read(session.id, "clean", { maxLines: body.lines ?? 100 });
  const updated = mgr.get(session.id)!;

  // Heuristic: pass if status is ready (command returned to prompt without error)
  // fail if status is error or output contains error patterns
  const passed = updated.status === "ready" && updated.stateResult.state !== "error";

  return c.json({
    ok: true,
    passed,
    status: updated.status,
    output: output.content,
    state_result: updated.stateResult,
    hint: passed ? "Verification passed." : "Verification failed.",
  });
}

async function handleBatch(c: Context, mgr: SessionManager, body: DoRequest) {
  // body.input should be a JSON array of action objects
  if (!body.input) return c.json({ ok: false, error: "input (JSON array of actions) required" }, 400);

  let actions: DoRequest[];
  try {
    actions = JSON.parse(body.input);
    if (!Array.isArray(actions)) throw new Error("not an array");
  } catch {
    return c.json({ ok: false, error: "input must be a JSON array of action objects" }, 400);
  }

  if (actions.length > 20) {
    return c.json({ ok: false, error: "batch limited to 20 actions" }, 400);
  }

  const results: any[] = [];

  for (const action of actions) {
    // Use a simpler approach: call the manager directly based on action type
    try {
      switch (action.action) {
        case "run":
          if (action.session && action.input) {
            const s = mgr.get(action.session);
            if (s) {
              if (s.status === "stopped" || s.status === "exited") {
                mgr.start(s.id);
                await delay(500);
              }
              mgr.write(s.id, action.input);
              await delay(1000);
              const out = mgr.read(s.id, "clean", { maxLines: 20 });
              results.push({ ok: true, action: action.action, session: action.session, output: out.content });
            } else {
              results.push({ ok: false, action: action.action, error: "session not found" });
            }
          }
          break;
        case "stop":
          if (action.session) { mgr.stop(action.session); results.push({ ok: true, action: "stop" }); }
          break;
        case "start":
          if (action.session) { mgr.start(action.session); results.push({ ok: true, action: "start" }); }
          break;
        case "cancel":
          if (action.session) { mgr.cancel(action.session); results.push({ ok: true, action: "cancel" }); }
          break;
        case "read":
          if (action.session) {
            const out = mgr.read(action.session, (action as any).output_mode ?? "clean", { maxLines: 20 });
            results.push({ ok: true, action: "read", output: out.content });
          }
          break;
        default:
          results.push({ ok: false, action: action.action, error: "unsupported in batch" });
      }
    } catch (err: any) {
      results.push({ ok: false, action: action.action, error: err.message });
    }
  }

  return c.json({
    ok: true,
    results,
    count: results.length,
    hint: `Executed ${results.length} action(s) in batch.`,
  });
}


// ---------------------------------------------------------------------------
// Automate — cron scheduling for sessions
// ---------------------------------------------------------------------------

function handleAutomate(c: Context, mgr: SessionManager, body: DoRequest) {
  if (!body.session) return c.json({ ok: false, error: "session required" }, 400);

  // input determines the sub-action: register, cancel, or list
  const subAction = (body.input ?? "list") as "register" | "cancel" | "list";

  if (subAction === "register") {
    if (!body.cron_expression) {
      return c.json({ ok: false, error: "cron_expression required for register" }, 400);
    }
    const result = mgr.automate(body.session, "register", body.cron_expression);
    if (!result.ok) {
      return c.json({
        ok: false,
        error: result.error,
        hint: result.error,
      }, 400);
    }
    return c.json({
      ok: true,
      next_fire: result.nextFire?.toISOString(),
      hint: `Cron registered: ${body.cron_expression}`,
    });
  }

  if (subAction === "cancel") {
    const result = mgr.automate(body.session, "cancel");
    return c.json({ ok: result.ok, hint: "Cron cancelled." });
  }

  // list
  const result = mgr.automate(body.session, "list");
  return c.json({
    ok: true,
    jobs: result.jobs?.map((j) => ({
      session_id: j.sessionId,
      expression: j.expression,
      next_fire: j.nextFire?.toISOString(),
      last_run: j.lastRun?.toISOString(),
    })),
    hint: `${result.jobs?.length ?? 0} cron job(s).`,
  });
}

// ---------------------------------------------------------------------------
// Bridge — Open Anvil browser control with progressive disclosure
// ---------------------------------------------------------------------------

async function handleBridge(c: Context, body: DoRequest) {
  // body.input is the tool/action name (e.g. 'navigate', 'read', 'click_element')
  // body.directory is repurposed as JSON args string for the tool
  if (!body.input) {
    // No tool specified — return bridge status and available actions
    const client = getBridgeClient();
    const status = client.status;
    return c.json({
      ok: true,
      bridge_status: status,
      hint: status.server
        ? "Anvil server running. Specify a tool: navigate, read, click, type, screenshot, or any Anvil tool name."
        : "Anvil server not running. It will start automatically on the first tool call.",
      actions_simplified: ["navigate", "read", "click", "type", "screenshot", "list_tabs", "find", "wait"],
      actions_full: "Use any of the 47 Anvil tools by name (e.g. distill_dom, perceive, set_of_marks)",
    });
  }

  // Parse args from body fields
  const toolName = body.input;
  let toolArgs: Record<string, any> = {};

  // Args can come from the 'directory' field (JSON string) or from common fields
  if (body.directory) {
    try {
      toolArgs = JSON.parse(body.directory);
    } catch {
      // Not JSON — treat as a simple value based on tool
      if (toolName === "navigate" || toolName === "navigate_to") {
        toolArgs = { url: body.directory };
      } else if (toolName === "click" || toolName === "click_element") {
        toolArgs = { selector: body.directory };
      } else if (toolName === "find" || toolName === "find_elements") {
        toolArgs = { query: body.directory };
      } else if (toolName === "wait" || toolName === "wait_for_element") {
        toolArgs = { selector: body.directory };
      }
    }
  }

  // Convenience: if session field has a URL and tool is navigate, use it
  if ((toolName === "navigate" || toolName === "navigate_to") && body.session && body.session.startsWith("http")) {
    toolArgs.url = toolArgs.url ?? body.session;
  }

  const client = getBridgeClient();
  const result = await client.callTool(toolName, toolArgs);

  return c.json({
    ok: result.ok,
    result: result.result,
    error: result.error,
    hint: result.hint ?? (result.ok ? "Browser tool executed successfully." : "Browser tool failed."),
    anvil_connected: result.anvil_connected,
    extension_connected: result.extension_connected,
    actions: ["navigate", "read", "click", "type", "screenshot", "list_tabs", "find", "wait"],
  });
}