/**
 * Automation — cron scheduling and session health monitoring.
 *
 * Ported from TCC's server.py (lines 382-456) and adapted to TypeScript.
 * Zero dependencies — pure computation.
 *
 * Cron expression format: "minute hour day month weekday" (5 fields)
 *   - minute: 0-59
 *   - hour: 0-23
 *   - day: 1-31
 *   - month: 1-12
 *   - weekday: 0-6 (0=Sunday)
 *   - Supports: *, digit, ranges (1-5), step (star/5), lists (1,3,5)
 */

// ---------------------------------------------------------------------------
// Cron field matching
// ---------------------------------------------------------------------------

function matchesCronField(fieldVal: string, cronVal: number): boolean {
  if (fieldVal === "*") return true;

  if (fieldVal.includes(",")) {
    return fieldVal.split(",").some((v) => matchesCronField(v.trim(), cronVal));
  }

  if (fieldVal.includes("/")) {
    const [base, stepStr] = fieldVal.split("/");
    const step = parseInt(stepStr!, 10);
    if (isNaN(step) || step <= 0) return false;
    if (base === "*") return cronVal % step === 0;
    const baseNum = parseInt(base!, 10);
    return !isNaN(baseNum) && cronVal >= baseNum && (cronVal - baseNum) % step === 0;
  }

  if (fieldVal.includes("-")) {
    const [startStr, endStr] = fieldVal.split("-");
    const start = parseInt(startStr!, 10);
    const end = parseInt(endStr!, 10);
    return !isNaN(start) && !isNaN(end) && cronVal >= start && cronVal <= end;
  }

  return parseInt(fieldVal, 10) === cronVal;
}

// ---------------------------------------------------------------------------
// Cron validation
// ---------------------------------------------------------------------------

export function validateCronExpression(expr: string): { valid: boolean; error?: string } {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { valid: false, error: "Must have exactly 5 fields: minute hour day month weekday" };
  }

  const ranges = [
    { name: "minute", min: 0, max: 59 },
    { name: "hour", min: 0, max: 23 },
    { name: "day", min: 1, max: 31 },
    { name: "month", min: 1, max: 12 },
    { name: "weekday", min: 0, max: 6 },
  ];

  for (let i = 0; i < 5; i++) {
    const field = parts[i]!;
    const range = ranges[i]!;

    if (field === "*") continue;

    // Split by comma for lists
    for (const part of field.split(",")) {
      const trimmed = part.trim();
      if (trimmed.includes("/")) {
        const [base, step] = trimmed.split("/");
        if (base !== "*" && isNaN(parseInt(base!, 10))) {
          return { valid: false, error: `Invalid step base in ${range.name}: ${base}` };
        }
        if (isNaN(parseInt(step!, 10)) || parseInt(step!, 10) <= 0) {
          return { valid: false, error: `Invalid step value in ${range.name}: ${step}` };
        }
      } else if (trimmed.includes("-")) {
        const [start, end] = trimmed.split("-");
        if (isNaN(parseInt(start!, 10)) || isNaN(parseInt(end!, 10))) {
          return { valid: false, error: `Invalid range in ${range.name}: ${trimmed}` };
        }
      } else if (isNaN(parseInt(trimmed, 10))) {
        return { valid: false, error: `Invalid value in ${range.name}: ${trimmed}` };
      }
    }
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Compute next fire time
// ---------------------------------------------------------------------------

export function computeNextCron(expression: string, since?: Date): Date | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minuteF, hourF, dayF, monthF, wdayF] = parts as [string, string, string, string, string];
  const start = since ?? new Date();

  // Start from the next minute
  const candidate = new Date(start);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  // Scan up to 1 year of minutes
  const maxIterations = 366 * 24 * 60;
  for (let i = 0; i < maxIterations; i++) {
    const month = candidate.getMonth() + 1; // 1-12
    const day = candidate.getDate();
    const hour = candidate.getHours();
    const minute = candidate.getMinutes();
    const wday = candidate.getDay(); // 0=Sunday

    if (!matchesCronField(monthF, month)) {
      // Skip to next month
      candidate.setMonth(candidate.getMonth() + 1, 1);
      candidate.setHours(0, 0, 0, 0);
      continue;
    }
    if (!matchesCronField(dayF, day)) {
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(0, 0, 0, 0);
      continue;
    }
    if (!matchesCronField(wdayF, wday)) {
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(0, 0, 0, 0);
      continue;
    }
    if (!matchesCronField(hourF, hour)) {
      candidate.setHours(candidate.getHours() + 1, 0, 0, 0);
      continue;
    }
    if (!matchesCronField(minuteF, minute)) {
      candidate.setMinutes(candidate.getMinutes() + 1, 0, 0);
      continue;
    }

    return candidate;
  }

  return null; // No match in the next year
}

// ---------------------------------------------------------------------------
// Automation runner — manages cron timers for sessions
// ---------------------------------------------------------------------------

export interface CronJob {
  sessionId: string;
  expression: string;
  nextFire: Date | null;
  timer: ReturnType<typeof setTimeout> | null;
  lastRun: Date | null;
}

export class AutomationRunner {
  private jobs = new Map<string, CronJob>();
  private onFire: (sessionId: string) => void;

  constructor(onFire: (sessionId: string) => void) {
    this.onFire = onFire;
  }

  /** Register a cron job for a session */
  register(sessionId: string, expression: string): { ok: boolean; error?: string; nextFire?: Date } {
    const validation = validateCronExpression(expression);
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }

    // Cancel existing job for this session
    this.cancel(sessionId);

    const nextFire = computeNextCron(expression);
    if (!nextFire) {
      return { ok: false, error: "No matching time found in the next year" };
    }

    const job: CronJob = {
      sessionId,
      expression,
      nextFire,
      timer: null,
      lastRun: null,
    };

    this._scheduleNext(job);
    this.jobs.set(sessionId, job);

    return { ok: true, nextFire };
  }

  /** Cancel a cron job */
  cancel(sessionId: string): void {
    const job = this.jobs.get(sessionId);
    if (job?.timer) {
      clearTimeout(job.timer);
    }
    this.jobs.delete(sessionId);
  }

  /** List all active cron jobs */
  list(): Array<{ sessionId: string; expression: string; nextFire: Date | null; lastRun: Date | null }> {
    return [...this.jobs.values()].map((j) => ({
      sessionId: j.sessionId,
      expression: j.expression,
      nextFire: j.nextFire,
      lastRun: j.lastRun,
    }));
  }

  /** Destroy all jobs */
  destroy(): void {
    for (const [id] of this.jobs) {
      this.cancel(id);
    }
  }

  private _scheduleNext(job: CronJob): void {
    if (!job.nextFire) return;

    const delayMs = Math.max(0, job.nextFire.getTime() - Date.now());

    // Cap at 24 hours — reschedule if further out (setTimeout max is ~24.8 days but let's be safe)
    const cappedDelay = Math.min(delayMs, 24 * 60 * 60 * 1000);

    job.timer = setTimeout(() => {
      if (delayMs <= cappedDelay) {
        // Fire!
        job.lastRun = new Date();
        this.onFire(job.sessionId);

        // Schedule next occurrence
        job.nextFire = computeNextCron(job.expression);
        this._scheduleNext(job);
      } else {
        // Not time yet — reschedule closer
        job.nextFire = computeNextCron(job.expression);
        this._scheduleNext(job);
      }
    }, cappedDelay);
  }
}
