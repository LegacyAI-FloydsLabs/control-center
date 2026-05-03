# Dashboard Issues Ledger

**Created:** 2026-05-01T01:16:09-0400
**Last Updated:** 2026-05-03T00:51:15-0400
**Governance:** .supercache/ v1.6.2

This is the active issue ledger for Dashboard. The architecture and beta-release work list live in `../SSOT/control-center_SSOT.md`.

---

## Status definitions

| Status | Meaning |
|---|---|
| New | Captured; not yet triaged |
| Triaged | Scoped; priority set; owner assigned |
| In progress | Active work underway |
| Blocked | Cannot proceed; blocker and next unblock action recorded |
| Resolved | Fix implemented; proof attached |
| Verified | Fix confirmed by rerun, test, or log evidence |
| Closed | Complete and stable; no further action expected |

---

## Issues Ledger

| ID | Created | Title | Status | Owner | Evidence / Links | Resolution Proof |
|---|---|---|---|---|---|---|
| ISSUE-0001 | 2026-05-03 00:51 EDT | Superseded ControlBoard/TCC/MWIDE documents quarantined after Dashboard SSOT correction | Verified | Floyd | `.floyd/quarantine/2026-05-03/` plus `.floyd/quarantine/LEDGER.jsonl`; canonical replacement is `control-center/SSOT/control-center_SSOT.md` | Quarantine script output listed 17 `status: quarantined` entries; active SSOT rewritten with Dashboard monoapplication copy rule and beta gates. |
| ISSUE-0002 | 2026-05-03 15:35 EDT | Native Playwright delete flow reports xterm WebGL dispose warning and iframe sandbox warning | New | Floyd | `with-server-playwright-smoke` output: console warning `term.dispose() failed: TypeError: Cannot read properties of undefined (reading 'onRequestRedraw')`; browser warning `iframe... allow-scripts and allow-same-origin... can escape its sandboxing` | Not remediated in this helper-blocker task; browser flow still returned `status: pass` and `pageerrors: []`. |

---

## Change Log (append-only)

- 2026-05-01T01:16:09-0400 — Initialized issues ledger.
- 2026-05-03T00:51:15-0400 — Replaced placeholder ledger with active Dashboard issue ledger and recorded superseded-document quarantine as ISSUE-0001.
- 2026-05-03T15:35:46-0400 — Recorded native Playwright console warnings from helper-managed browser smoke as ISSUE-0002; not fixed in this scope.

---

## Mandatory execution contract

For EACH requested item:
1. Show exact action taken
2. Show direct evidence (file/line/command/output)
3. Show verification result
4. Mark status only after proof

## Forbidden behaviors
- Declaring completion without evidence
- Collapsing multiple requested items into one vague summary
- Skipping failed steps without explicit blocker report
- Deleting instead of quarantining

## Required output structure
A) Requested items checklist
B) Per-item evidence ledger
C) Verification receipts
D) Completeness matrix

## Hard gate
If any requested item has no evidence row, final status MUST be INCOMPLETE.
