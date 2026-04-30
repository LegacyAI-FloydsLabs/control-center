# terminal-control-center — Issues Ledger
**Created:** 2026-04-09

---

## Open Issues

| ID | Severity | Summary | Reported | Status |
|---|---|---|---|---|

---

## Resolved Issues

| ID | Summary | Resolved | Resolution |
|---|---|---|---|

---

## Blockers

| Blocker | Impact | Owner | ETA |
|---|---|---|---|

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
