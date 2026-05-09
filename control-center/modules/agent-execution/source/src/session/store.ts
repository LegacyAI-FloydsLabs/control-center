/**
 * SQLite persistence for sessions.
 *
 * Stores session configs so they survive server restarts.
 * Runtime state (status, pid, scrollback) stays in memory.
 */
import Database from "better-sqlite3";
import path from "node:path";
import type { Session, SessionConfig } from "./model.js";
import { SESSION_DEFAULTS } from "./model.js";
import { v4 as uuid } from "uuid";

const DB_PATH = process.env.ATERM_DB ?? path.join(process.cwd(), "aterm.db");

export class SessionStore {
  private db: Database.Database;

  constructor(dbPath?: string) {
    this.db = new Database(dbPath ?? DB_PATH);
    this.db.pragma("journal_mode = WAL");
    this._migrate();
  }

  private _migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        label TEXT,
        command TEXT NOT NULL,
        directory TEXT NOT NULL,
        env TEXT,           -- JSON
        tags TEXT,           -- JSON array
        "order" INTEGER DEFAULT 0,
        pinned INTEGER DEFAULT 0,
        auto_start INTEGER DEFAULT 0,
        auto_restart INTEGER DEFAULT 0,
        restart_policy TEXT, -- JSON
        automation TEXT,     -- JSON
        scrollback_bytes INTEGER DEFAULT 262144,
        scratchpad TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS command_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        command TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cmd_history_session
        ON command_history(session_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS checkpoints (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        scrollback TEXT,
        env TEXT,             -- JSON
        cwd TEXT,
        command_history TEXT, -- JSON array
        scratchpad TEXT,
        session_config TEXT,  -- JSON (full session config at checkpoint time)
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_checkpoints_session
        ON checkpoints(session_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS recordings (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        events TEXT,          -- JSON array of recorded events
        started_at INTEGER NOT NULL,
        ended_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_recordings_session
        ON recordings(session_id, started_at);
    `);
  }

  /** Create a session from config. Returns the full session with defaults applied. */
  create(config: SessionConfig): Session {
    const id = uuid();
    const now = Date.now();
    const session: Session = {
      ...SESSION_DEFAULTS,
      id,
      name: config.name,
      label: config.label ?? null,
      command: config.command,
      directory: config.directory,
      env: config.env ?? null,
      tags: config.tags ?? [],
      order: config.order ?? 0,
      pinned: config.pinned ?? false,
      autoStart: config.autoStart ?? false,
      autoRestart: config.autoRestart ?? false,
      restartPolicy: config.restartPolicy ?? SESSION_DEFAULTS.restartPolicy,
      automation: config.automation ?? SESSION_DEFAULTS.automation,
      scrollbackBytes: config.scrollbackBytes ?? SESSION_DEFAULTS.scrollbackBytes,
      createdAt: now,
      updatedAt: now,
    };

    this.db.prepare(`
      INSERT INTO sessions (id, name, label, command, directory, env, tags, "order",
        pinned, auto_start, auto_restart, restart_policy, automation, scrollback_bytes,
        scratchpad, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id, session.name, session.label, session.command, session.directory,
      session.env ? JSON.stringify(session.env) : null,
      JSON.stringify(session.tags), session.order,
      session.pinned ? 1 : 0, session.autoStart ? 1 : 0, session.autoRestart ? 1 : 0,
      JSON.stringify(session.restartPolicy), JSON.stringify(session.automation),
      session.scrollbackBytes, session.scratchpad, session.createdAt, session.updatedAt,
    );

    return session;
  }

  /** List all sessions (config only, runtime state is added by the manager) */
  list(): Session[] {
    const rows = this.db.prepare("SELECT * FROM sessions ORDER BY \"order\" ASC, name ASC").all() as any[];
    return rows.map((r) => this._rowToSession(r));
  }

  /** Get a session by ID or name */
  get(idOrName: string): Session | undefined {
    const row = this.db.prepare(
      "SELECT * FROM sessions WHERE id = ? OR name = ?"
    ).get(idOrName, idOrName) as any | undefined;
    return row ? this._rowToSession(row) : undefined;
  }

  /** Update mutable fields */
  update(id: string, fields: Partial<SessionConfig> & { scratchpad?: string }): void {
    const existing = this.get(id);
    if (!existing) throw new Error(`Session ${id} not found`);

    const updates: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, [string, (v: any) => any]> = {
      name: ["name", (v) => v],
      label: ["label", (v) => v ?? null],
      command: ["command", (v) => v],
      directory: ["directory", (v) => v],
      env: ["env", (v) => v ? JSON.stringify(v) : null],
      tags: ["tags", (v) => JSON.stringify(v ?? [])],
      order: ["\"order\"", (v) => v],
      pinned: ["pinned", (v) => v ? 1 : 0],
      autoStart: ["auto_start", (v) => v ? 1 : 0],
      autoRestart: ["auto_restart", (v) => v ? 1 : 0],
      restartPolicy: ["restart_policy", (v) => JSON.stringify(v)],
      automation: ["automation", (v) => JSON.stringify(v)],
      scrollbackBytes: ["scrollback_bytes", (v) => v],
      scratchpad: ["scratchpad", (v) => v],
    };

    for (const [key, val] of Object.entries(fields)) {
      const mapping = fieldMap[key];
      if (mapping) {
        updates.push(`${mapping[0]} = ?`);
        values.push(mapping[1](val));
      }
    }

    if (updates.length === 0) return;

    updates.push("updated_at = ?");
    values.push(Date.now());
    values.push(id);

    this.db.prepare(
      `UPDATE sessions SET ${updates.join(", ")} WHERE id = ?`
    ).run(...values);
  }

  /** Delete a session */
  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
    return result.changes > 0;
  }

  /** Record a command in history */
  recordCommand(sessionId: string, command: string): void {
    this.db.prepare(
      "INSERT INTO command_history (session_id, command, created_at) VALUES (?, ?, ?)"
    ).run(sessionId, command, Date.now());
  }

  /** Get recent command history for a session */
  getHistory(sessionId: string, limit = 50): string[] {
    const rows = this.db.prepare(
      "SELECT command FROM command_history WHERE session_id = ? ORDER BY created_at DESC LIMIT ?"
    ).all(sessionId, limit) as any[];
    return rows.map((r) => r.command).reverse();
  }

  /** Import from TCC agents.json format */
  importTccAgents(agents: Record<string, any>): number {
    let count = 0;
    for (const [, agent] of Object.entries(agents)) {
      const existing = this.get(agent.name);
      if (existing) continue; // skip duplicates

      this.create({
        name: agent.name,
        label: agent.label,
        command: agent.command,
        directory: agent.directory,
        env: agent.env,
        tags: agent.tags,
        order: agent.order ?? 0,
        pinned: agent.pinned ?? false,
        autoStart: agent.auto_start ?? false,
        autoRestart: false,
        automation: agent.launchd_type && agent.launchd_type !== "none"
          ? {
              type: agent.launchd_type,
              interval: agent.launchd_interval,
              watchPath: agent.launchd_watchpath,
              cronExpression: agent.cron_expression,
            }
          : { type: "none" },
      });
      count++;
    }
    return count;
  }

  // -----------------------------------------------------------------------
  // Checkpoints
  // -----------------------------------------------------------------------

  /** Save a checkpoint for a session */
  saveCheckpoint(
    sessionId: string,
    name: string,
    data: { scrollback: string; env: Record<string, string> | null; cwd: string; commandHistory: string[]; scratchpad: string; sessionConfig: any },
  ): string {
    const id = uuid();
    this.db.prepare(`
      INSERT INTO checkpoints (id, session_id, name, scrollback, env, cwd, command_history, scratchpad, session_config, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, sessionId, name, data.scrollback,
      data.env ? JSON.stringify(data.env) : null,
      data.cwd, JSON.stringify(data.commandHistory),
      data.scratchpad, JSON.stringify(data.sessionConfig), Date.now(),
    );
    return id;
  }

  /** List checkpoints for a session */
  listCheckpoints(sessionId: string): Array<{ id: string; name: string; createdAt: number }> {
    return (this.db.prepare(
      "SELECT id, name, created_at FROM checkpoints WHERE session_id = ? ORDER BY created_at DESC"
    ).all(sessionId) as any[]).map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
  }

  /** Get a checkpoint by ID */
  getCheckpoint(checkpointId: string): any | undefined {
    const r = this.db.prepare("SELECT * FROM checkpoints WHERE id = ?").get(checkpointId) as any;
    if (!r) return undefined;
    return {
      id: r.id,
      sessionId: r.session_id,
      name: r.name,
      scrollback: r.scrollback,
      env: r.env ? JSON.parse(r.env) : null,
      cwd: r.cwd,
      commandHistory: r.command_history ? JSON.parse(r.command_history) : [],
      scratchpad: r.scratchpad,
      sessionConfig: r.session_config ? JSON.parse(r.session_config) : null,
      createdAt: r.created_at,
    };
  }

  // -----------------------------------------------------------------------
  // Recordings
  // -----------------------------------------------------------------------

  /** Start a recording */
  startRecording(sessionId: string, name: string): string {
    const id = uuid();
    this.db.prepare(`
      INSERT INTO recordings (id, session_id, name, events, started_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, sessionId, name, "[]", Date.now());
    return id;
  }

  /** Append an event to a recording */
  appendRecordingEvent(recordingId: string, event: any): void {
    const r = this.db.prepare("SELECT events FROM recordings WHERE id = ?").get(recordingId) as any;
    if (!r) return;
    const events = JSON.parse(r.events);
    events.push({ ...event, timestamp: Date.now() });
    this.db.prepare("UPDATE recordings SET events = ? WHERE id = ?").run(JSON.stringify(events), recordingId);
  }

  /** Stop a recording */
  stopRecording(recordingId: string): void {
    this.db.prepare("UPDATE recordings SET ended_at = ? WHERE id = ?").run(Date.now(), recordingId);
  }

  /** Get a recording */
  getRecording(recordingId: string): any | undefined {
    const r = this.db.prepare("SELECT * FROM recordings WHERE id = ?").get(recordingId) as any;
    if (!r) return undefined;
    return {
      id: r.id,
      sessionId: r.session_id,
      name: r.name,
      events: JSON.parse(r.events),
      startedAt: r.started_at,
      endedAt: r.ended_at,
    };
  }

  /** List recordings for a session */
  listRecordings(sessionId: string): Array<{ id: string; name: string; startedAt: number; endedAt: number | null }> {
    return (this.db.prepare(
      "SELECT id, name, started_at, ended_at FROM recordings WHERE session_id = ? ORDER BY started_at DESC"
    ).all(sessionId) as any[]).map((r) => ({ id: r.id, name: r.name, startedAt: r.started_at, endedAt: r.ended_at }));
  }

  /** Close the database connection */
  close(): void {
    this.db.close();
  }

  private _rowToSession(r: any): Session {
    return {
      id: r.id,
      name: r.name,
      label: r.label,
      command: r.command,
      directory: r.directory,
      env: r.env ? JSON.parse(r.env) : null,
      tags: r.tags ? JSON.parse(r.tags) : [],
      order: r.order,
      pinned: !!r.pinned,
      autoStart: !!r.auto_start,
      autoRestart: !!r.auto_restart,
      restartPolicy: r.restart_policy ? JSON.parse(r.restart_policy) : SESSION_DEFAULTS.restartPolicy,
      automation: r.automation ? JSON.parse(r.automation) : SESSION_DEFAULTS.automation,
      scrollbackBytes: r.scrollback_bytes,
      scratchpad: r.scratchpad ?? "",
      // Runtime defaults — overwritten by SessionManager
      status: "stopped",
      pid: null,
      startedAt: null,
      restartCount: 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
