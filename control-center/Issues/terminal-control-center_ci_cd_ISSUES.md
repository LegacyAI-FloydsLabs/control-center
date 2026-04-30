# terminal-control-center CI/CD Issues Ledger

## How to use this document
- This is the living help desk for CI/CD + repo-operations issues.
- Add a new issue in the ledger table.
- For every change, append a timestamped entry in the Change Log.

## Status definitions
- **New**: captured, not yet triaged
- **Triaged**: scoped, priority set, owner assigned
- **In progress**: active work underway
- **Blocked**: cannot proceed (record blocker + next unblock action)
- **Resolved**: fix implemented (attach proof)
- **Verified**: fix confirmed by rerun/test/log evidence
- **Closed**: complete and stable

## Issues ledger

| ID | Created (timestamp) | Title | Status | Owner | Evidence / Links | Resolution Proof |
|---|---|---|---|---|---|---|
| ISSUE-0001 | 2026-04-11 02:30 EDT | launchd service fails exit 78 on external volume paths | Closed | douglastalley | launchd plist referenced /Volumes/ for WorkingDirectory and log paths; macOS Tahoe sandboxing rejects external volume paths for launchd bookkeeping | Fixed: wrapper script waits for mount, logs routed to /tmp/ — service running PID 54919 exit 0. Verified: `launchctl list | grep legacyai.tcc` → PID 54919 exit 0; `curl localhost:9527/api/health` → `{"status":"ok"}` |

## Change Log (append-only)
- 2026-04-11 02:30 EDT — Initialized issues ledger per governance protocol.
- 2026-04-11 02:30 EDT — Backfilled ISSUE-0001 (launchd) from current session.
- 2026-04-11 02:35 EDT — Removed ISSUE-0002 (hookify) — that bug belongs to the Claude Code harness, not this project.
- 2026-04-11 02:45 EDT — Closed ISSUE-0001 (launchd) — fix verified, service stable.

---

## Enforcement

All issues in this ledger MUST be:
- Logged with full evidence at time of discovery
- Tracked through the complete lifecycle (New → Closed)
- Resolved with attached proof (command output, file diffs, test results)
- Never silently removed or status-changed without an append-only change log entry

No issue may be marked Resolved without resolution proof. No issue may be marked Closed without verification evidence confirming the fix holds.

---

## Mandatory execution contract
For EACH requested item:
1) Show exact action taken
2) Show direct evidence (file/line/command/output)
3) Show verification result
4) Mark status only after proof

## Forbidden behaviors
- Declaring "done" without evidence
- Collapsing multiple requested items into one vague summary
- Skipping failed steps without explicit blocker report

## Required output structure
A) Requested items checklist
B) Per-item evidence ledger
C) Verification receipts
D) Completeness matrix (item -> done/blocked -> evidence)

## Hard gate
If any requested item has no evidence row, final status MUST be INCOMPLETE.
