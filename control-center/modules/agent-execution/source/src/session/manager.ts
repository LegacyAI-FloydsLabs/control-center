/**
 * Session Manager — the orchestration layer.
 *
 * Wires together:
 *   SessionStore (persistence) + PtyPool (processes) + Output Intelligence
 *
 * This is the single source of truth for session state.
 */
import { EventEmitter } from "node:events";
import { PtyPool, type PtyInstance } from "../pty/pool.js";
import { StateDetector, type StateResult, type CommandContext } from "../intel/state.js";
import { distill, type DistillMode, type DistilledOutput } from "../intel/distill.js";
import { buildMarks, getMark, type OutputMark } from "../intel/marks.js";
import { AutomationRunner } from "./automation.js";
import { SessionStore } from "./store.js";
import type { Session, SessionConfig, SessionStatus } from "./model.js";

export interface SessionWithState extends Session {
  stateResult: StateResult;
  marks: OutputMark[];
}

export class SessionManager extends EventEmitter {
  private store: SessionStore;
  private pool: PtyPool;
  private detectors = new Map<string, StateDetector>();
  private automation: AutomationRunner;

  constructor(store: SessionStore) {
    super();
    this.store = store;
    this.pool = new PtyPool();
    this.automation = new AutomationRunner((sessionId) => this._onCronFire(sessionId));

    // Wire PTY events to state detection
    this.pool.on("data", (id: string, _data: string) => {
      this._updateState(id);
      this.emit("data", id, _data);
    });

    this.pool.on("exit", (id: string, exitCode: number, signal: number) => {
      this._updateState(id);
      this.emit("exit", id, exitCode, signal);
    });

    this.pool.on("spawn", (id: string, pid: number) => {
      const detector = this._detector(id);
      detector.notifySpawn();
      this.emit("spawn", id, pid);
    });
  }

  /** Create a new session from config, persist it, optionally start it */
  create(config: SessionConfig, start = false): Session {
    const session = this.store.create(config);
    if (start || config.autoStart) {
      this.start(session.id);
    }
    // Register cron automation if configured
    if (session.automation.type === "cron" && session.automation.cronExpression) {
      const result = this.automation.register(session.id, session.automation.cronExpression);
      if (result.ok) {
        console.log(`Cron registered for ${session.name}: ${session.automation.cronExpression} (next: ${result.nextFire?.toISOString()})`);
      } else {
        console.error(`Cron registration failed for ${session.name}: ${result.error}`);
      }
    }
    return this._enrichSession(session);
  }

  /** Start a session's PTY process */
  start(idOrName: string): void {
    const session = this.store.get(idOrName);
    if (!session) throw new Error(`Session ${idOrName} not found`);

    // Don't double-start
    const existing = this.pool.get(session.id);
    if (existing?.running) return;
    if (existing) this.pool.remove(session.id);

    this.pool.spawn(session.id, {
      command: session.command,
      cwd: session.directory,
      env: session.env ?? undefined,
      scrollbackBytes: session.scrollbackBytes,
    }, session.restartPolicy);
  }

  /** Stop a session's PTY process */
  stop(idOrName: string): void {
    const session = this.store.get(idOrName);
    if (!session) throw new Error(`Session ${idOrName} not found`);
    this.pool.remove(session.id);
  }

  /** Send input to a session */
  write(idOrName: string, input: string): void {
    const session = this.store.get(idOrName);
    if (!session) throw new Error(`Session ${idOrName} not found`);

    // Ensure input ends with carriage return
    const data = input.endsWith("\r") || input.endsWith("\n") ? input : input + "\r";
    this.pool.write(session.id, data);

    // Record to history
    const cleaned = input.replace(/[\r\n]+$/, "").trim();
    if (cleaned) this.store.recordCommand(session.id, cleaned);
  }

  /** Send Ctrl+C (interrupt) */
  cancel(idOrName: string): void {
    const session = this.store.get(idOrName);
    if (!session) throw new Error(`Session ${idOrName} not found`);
    const pty = this.pool.get(session.id);
    if (pty?.process) pty.process.write("\x03");
  }

  /** Delete a session (stop + remove from store + cancel cron) */
  delete(idOrName: string): boolean {
    const session = this.store.get(idOrName);
    if (!session) return false;
    this.pool.remove(session.id);
    this.detectors.delete(session.id);
    this.automation.cancel(session.id);
    return this.store.delete(session.id);
  }

  /** List all sessions with runtime state */
  list(): SessionWithState[] {
    return this.store.list().map((s) => this._enrichSession(s));
  }

  /** Get a single session with runtime state */
  get(idOrName: string): SessionWithState | undefined {
    const session = this.store.get(idOrName);
    if (!session) return undefined;
    return this._enrichSession(session);
  }

  /** Read session output in a distillation mode */
  read(idOrName: string, mode: DistillMode = "clean", options?: { consumerId?: string; maxLines?: number }): DistilledOutput {
    const session = this.store.get(idOrName);
    if (!session) throw new Error(`Session ${idOrName} not found`);
    const pty = this.pool.get(session.id);
    if (!pty) throw new Error(`Session ${idOrName} has no PTY`);
    return distill(pty.scrollback, mode, options);
  }

  /** Get output marks for a session */
  marks(idOrName: string): OutputMark[] {
    const session = this.store.get(idOrName);
    if (!session) throw new Error(`Session ${idOrName} not found`);
    const pty = this.pool.get(session.id);
    if (!pty) return [];
    return buildMarks(pty.markSource);
  }

  /** Get a specific mark by ID */
  mark(idOrName: string, markId: number): OutputMark | undefined {
    const marks = this.marks(idOrName);
    return getMark(marks, markId);
  }

  /** Update session config */
  update(idOrName: string, fields: Partial<SessionConfig> & { scratchpad?: string }): void {
    const session = this.store.get(idOrName);
    if (!session) throw new Error(`Session ${idOrName} not found`);
    this.store.update(session.id, fields);
  }

  /** Get command history for a session */
  history(idOrName: string, limit = 50): string[] {
    const session = this.store.get(idOrName);
    if (!session) throw new Error(`Session ${idOrName} not found`);
    return this.store.getHistory(session.id, limit);
  }

  /** Get the PTY instance for WebSocket streaming */
  getPty(idOrName: string): PtyInstance | undefined {
    const session = this.store.get(idOrName);
    if (!session) return undefined;
    return this.pool.get(session.id);
  }

  /** Auto-start sessions that have autoStart enabled */
  autoStartAll(): number {
    const sessions = this.store.list()
      .filter((s) => s.autoStart)
      .sort((a, b) => a.order - b.order);

    let started = 0;
    for (const session of sessions) {
      try {
        this.start(session.id);
        started++;
      } catch {
        // Log but don't fail others
      }
    }
    return started;
  }

  /** Import TCC agents.json */
  importTcc(agents: Record<string, any>): number {
    return this.store.importTccAgents(agents);
  }

  // -----------------------------------------------------------------------
  // Checkpoints
  // -----------------------------------------------------------------------

  /** Save a checkpoint of the current session state */
  saveCheckpoint(idOrName: string, name: string): string {
    const session = this.store.get(idOrName);
    if (!session) throw new Error(`Session ${idOrName} not found`);
    const pty = this.pool.get(session.id);
    return this.store.saveCheckpoint(session.id, name, {
      scrollback: pty?.scrollback.raw() ?? "",
      env: pty?.currentEnv ?? session.env,
      cwd: pty?.currentCwd ?? session.directory,
      commandHistory: pty?.commandHistory ?? [],
      scratchpad: session.scratchpad,
      sessionConfig: {
        name: session.name, command: session.command, directory: pty?.currentCwd ?? session.directory,
        env: pty?.currentEnv ?? session.env, tags: session.tags,
      },
    });
  }

  /** Restore a checkpoint — kills current PTY, restores saved state */
  restoreCheckpoint(idOrName: string, checkpointId: string): boolean {
    const session = this.store.get(idOrName);
    if (!session) return false;
    const cp = this.store.getCheckpoint(checkpointId);
    if (!cp || cp.sessionId !== session.id) return false;

    // Kill current PTY
    this.pool.remove(session.id);

    // Update session with checkpoint data
    this.store.update(session.id, {
      scratchpad: cp.scratchpad,
      directory: cp.cwd ?? session.directory,
      env: cp.env ?? session.env,
    });

    // Restart and replay scrollback
    this.start(session.id);
    // Wait a moment then write scrollback to the terminal display
    // (The PTY is fresh, we just show the old output visually)
    setTimeout(() => {
      const pty = this.pool.get(session.id);
      if (pty && cp.scrollback) {
        // Inject scrollback into the buffer for display purposes
        pty.scrollback.append(cp.scrollback);
        this.emit("data", session.id, cp.scrollback);
      }
    }, 500);

    return true;
  }

  /** List checkpoints for a session */
  listCheckpoints(idOrName: string): Array<{ id: string; name: string; createdAt: number }> {
    const session = this.store.get(idOrName);
    if (!session) return [];
    return this.store.listCheckpoints(session.id);
  }

  // -----------------------------------------------------------------------
  // Recordings
  // -----------------------------------------------------------------------

  /** Start recording a session */
  startRecording(idOrName: string, name: string): string {
    const session = this.store.get(idOrName);
    if (!session) throw new Error(`Session ${idOrName} not found`);
    return this.store.startRecording(session.id, name);
  }

  /** Stop a recording */
  stopRecording(recordingId: string): void {
    this.store.stopRecording(recordingId);
  }

  /** Get a recording */
  getRecording(recordingId: string): any {
    return this.store.getRecording(recordingId);
  }

  /** List recordings for a session */
  listRecordings(idOrName: string): any[] {
    const session = this.store.get(idOrName);
    if (!session) return [];
    return this.store.listRecordings(session.id);
  }

  /** Clean shutdown */
  destroy(): void {
    this.automation.destroy();
    this.pool.destroyAll();
    this.store.close();
  }
  /** Manage cron automation for a session */
  automate(idOrName: string, action: "register" | "cancel" | "list", cronExpression?: string): {
    ok: boolean; error?: string; nextFire?: Date; jobs?: ReturnType<AutomationRunner["list"]>;
  } {
    const session = this.store.get(idOrName);
    if (!session) return { ok: false, error: `Session ${idOrName} not found` };

    if (action === "cancel") {
      this.automation.cancel(session.id);
      return { ok: true };
    }

    if (action === "list") {
      return { ok: true, jobs: this.automation.list() };
    }

    if (action === "register") {
      if (!cronExpression) return { ok: false, error: "cronExpression required for register" };
      const result = this.automation.register(session.id, cronExpression);
      if (result.ok) {
        // Persist the automation config on the session
        this.store.update(session.id, {
          automation: { type: "cron", cronExpression },
        });
      }
      return result;
    }

    return { ok: false, error: `Unknown automate action: ${action}` };
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private _onCronFire(sessionId: string): void {
    const session = this.store.get(sessionId);
    if (!session) {
      this.automation.cancel(sessionId);
      return;
    }

    // Re-run the session's command
    // If the session is running, write the command; if not, start it
    const pty = this.pool.get(sessionId);
    if (pty?.running) {
      this.write(sessionId, session.command);
    } else {
      this.start(sessionId);
    }
    this.emit("cron", sessionId, session.name);
  }


  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private _detector(sessionId: string): StateDetector {
    let d = this.detectors.get(sessionId);
    if (!d) {
      d = new StateDetector();
      this.detectors.set(sessionId, d);
    }
    return d;
  }

  private _updateState(sessionId: string): void {
    const pty = this.pool.get(sessionId);
    if (!pty) return;

    const detector = this._detector(sessionId);
    const raw = pty.scrollback.raw();
    const lastLine = raw.split("\n").filter((l) => l.trim()).pop() ?? "";
    const recentOutput = pty.commandActive && pty.lastCommandOutputStartOffset !== null
      ? pty.markSource.slice(pty.lastCommandOutputStartOffset)
      : raw.slice(-2048);

    const ctx: CommandContext = {
      commandPending: pty.commandActive,
      lastCommandText: pty.lastCommandText,
      lastCommandSentAt: pty.lastCommandSentAt,
      lastOutputAt: pty.lastOutputAt,
      processRunning: pty.running,
      exitCode: pty.exitCode,
    };

    const result = detector.detect(lastLine, recentOutput, ctx);
    if (result.state === "ready" || result.state === "error" || result.state === "exited") {
      pty.commandActive = false;
    }
    this.emit("state", sessionId, result);
  }

  private _enrichSession(session: Session): SessionWithState {
    const pty = this.pool.get(session.id);
    const detector = this._detector(session.id);

    return {
      ...session,
      status: (pty?.running
        ? detector.lastResult.state
        : pty?.exitCode !== null && pty?.exitCode !== undefined
          ? "exited"
          : "stopped") as SessionStatus,
      pid: pty?.pid ?? null,
      startedAt: pty?.startedAt ?? null,
      restartCount: pty?.restartCount ?? 0,
      stateResult: detector.lastResult,
      marks: pty ? buildMarks(pty.markSource) : [],
    };
  }
}
