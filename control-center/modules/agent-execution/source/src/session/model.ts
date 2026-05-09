/**
 * Session model — the managed object that wraps a PTY + Output Intelligence.
 *
 * A session is not just a PTY. It has identity, semantic state, lifecycle
 * rules, working memory, and metrics.
 */

export type SessionStatus =
  | "stopped"
  | "starting"
  | "ready"
  | "busy"
  | "waiting_for_input"
  | "error"
  | "exited";

export type AutomationType = "none" | "timer" | "hook" | "keepalive" | "cron";

export interface RestartPolicy {
  maxRetries: number;
  windowSeconds: number;
}

export interface Automation {
  type: AutomationType;
  interval?: number;         // seconds (for timer)
  watchPath?: string;        // path (for hook)
  cronExpression?: string;   // 5-field (for cron)
}

export interface SessionConfig {
  name: string;
  label?: string;
  command: string;
  directory: string;
  env?: Record<string, string>;
  tags?: string[];
  order?: number;
  pinned?: boolean;
  autoStart?: boolean;
  autoRestart?: boolean;
  restartPolicy?: RestartPolicy;
  automation?: Automation;
  scrollbackBytes?: number;
}

export interface Session {
  id: string;
  name: string;
  label: string | null;
  command: string;
  directory: string;
  env: Record<string, string> | null;
  tags: string[];
  order: number;
  pinned: boolean;
  autoStart: boolean;
  autoRestart: boolean;
  restartPolicy: RestartPolicy;
  automation: Automation;
  scrollbackBytes: number;

  // Runtime (not persisted, computed from PTY pool)
  status: SessionStatus;
  pid: number | null;
  startedAt: number | null;
  restartCount: number;
  scratchpad: string;

  createdAt: number;
  updatedAt: number;
}

/** Defaults for new sessions */
export const SESSION_DEFAULTS: Omit<Session, "id" | "name" | "command" | "directory" | "createdAt" | "updatedAt"> = {
  label: null,
  env: null,
  tags: [],
  order: 0,
  pinned: false,
  autoStart: false,
  autoRestart: false,
  restartPolicy: { maxRetries: 3, windowSeconds: 300 },
  automation: { type: "none" },
  scrollbackBytes: 256 * 1024,
  status: "stopped",
  pid: null,
  startedAt: null,
  restartCount: 0,
  scratchpad: "",
};
