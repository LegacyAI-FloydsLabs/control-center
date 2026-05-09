import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateCronExpression, computeNextCron } from "./automation.js";

describe("Cron Validation", () => {
  it("accepts valid 5-field expressions", () => {
    assert.ok(validateCronExpression("0 * * * *").valid);
    assert.ok(validateCronExpression("*/5 * * * *").valid);
    assert.ok(validateCronExpression("0 9 * * 1-5").valid);
    assert.ok(validateCronExpression("30 2 1 * *").valid);
    assert.ok(validateCronExpression("0 0 * * 0").valid);
    assert.ok(validateCronExpression("0,30 * * * *").valid);
  });

  it("rejects invalid expressions", () => {
    assert.ok(!validateCronExpression("").valid);
    assert.ok(!validateCronExpression("* * *").valid); // too few fields
    assert.ok(!validateCronExpression("* * * * * *").valid); // too many
    assert.ok(!validateCronExpression("abc * * * *").valid);
  });

  it("provides error messages", () => {
    const r = validateCronExpression("abc * * * *");
    assert.ok(r.error?.includes("minute"));
  });
});

describe("Cron Next Fire", () => {
  it("computes next minute for '* * * * *'", () => {
    const now = new Date(2026, 3, 24, 12, 0, 0); // Apr 24, 2026, 12:00
    const next = computeNextCron("* * * * *", now);
    assert.ok(next);
    assert.equal(next.getMinutes(), 1); // 12:01
    assert.equal(next.getHours(), 12);
  });

  it("computes next hour for '0 * * * *'", () => {
    const now = new Date(2026, 3, 24, 12, 30, 0);
    const next = computeNextCron("0 * * * *", now);
    assert.ok(next);
    assert.equal(next.getMinutes(), 0);
    assert.equal(next.getHours(), 13);
  });

  it("computes every 5 minutes for '*/5 * * * *'", () => {
    const now = new Date(2026, 3, 24, 12, 3, 0);
    const next = computeNextCron("*/5 * * * *", now);
    assert.ok(next);
    assert.equal(next.getMinutes(), 5);
  });

  it("computes weekday filter '0 9 * * 1-5'", () => {
    // Apr 24 2026 is a Friday (day 5)
    const friday = new Date(2026, 3, 24, 10, 0, 0); // After 9am
    const next = computeNextCron("0 9 * * 1-5", friday);
    assert.ok(next);
    // Next weekday 9:00 is Monday Apr 27
    assert.equal(next.getDay(), 1); // Monday
    assert.equal(next.getHours(), 9);
    assert.equal(next.getMinutes(), 0);
  });

  it("computes monthly for '0 0 1 * *'", () => {
    const now = new Date(2026, 3, 24, 12, 0, 0); // Apr 24
    const next = computeNextCron("0 0 1 * *", now);
    assert.ok(next);
    assert.equal(next.getMonth(), 4); // May
    assert.equal(next.getDate(), 1);
  });

  it("returns null for impossible expression", () => {
    // Feb 31 doesn't exist — but the scanner should skip it
    const next = computeNextCron("0 0 31 2 *");
    assert.equal(next, null);
  });
});
