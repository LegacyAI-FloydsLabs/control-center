# Dashboard — CLAUDE.md

**Version:** 1.0.0
**Initialized:** 2026-04-30
**Governance:** .supercache/ v1.6.2
**Canonical spec:** `FLOYD.md` and `SSOT/control-center_SSOT.md`

---

## Relationship to FLOYD.md and SSOT

`FLOYD.md` is the project-governance entrypoint. `SSOT/control-center_SSOT.md` is authoritative for Dashboard product facts, architecture decisions, beta gates, remaining work, and verification records.

This file is only the Claude-specific adapter. If this file conflicts with FLOYD.md or the SSOT on project facts, the SSOT wins.

---

## Agent Role on This Project

Claude/Floyd on Dashboard operates as a high-reliability implementation and verification agent.

Primary obligations:

- preserve Dashboard as one coherent monoapplication
- copy actual source-app code into Dashboard-owned paths before adaptation
- keep original source applications standalone and untouched unless explicitly tasked otherwise
- reject iframe/launcher/adapter-only final integrations unless the SSOT is updated by user decision
- maintain Dashboard-native naming, routing, port, state, docs, and tests
- quarantine superseded docs instead of deleting them
- produce evidence before status claims

---

## Project-Specific Rules

| # | Rule | Rationale |
|---|---|---|
| C1 | Do not edit original source apps as part of Dashboard integration. | Source apps remain standalone reusable products. |
| C2 | Start copied-module work by copying actual source code into Dashboard. | User explicitly rejected inspiration rewrites. |
| C3 | Do not preserve source-app names as final user-facing Dashboard module names. | Dashboard is one new product. |
| C4 | Any SSOT or doc change must check for conflicting active docs and quarantine superseded files. | Prevents stale plans from misleading future sessions. |
| C5 | Before claiming beta readiness, run app tests and browser/API smoke for the complete operator journey. | Dashboard beta is behavioral, not just textual or compile-level. |
| C6 | Never write to `/Volumes/SanDisk1Tb/.supercache/`. | Global governance is read-only for agents. |

---

## Verification Before Completion

Every claimed completion must include:

1. exact action taken
2. direct evidence: file/line, command/output, diff, or quarantine ledger
3. verification result
4. completeness matrix

If quarantine occurred, include:

- count of quarantined items
- active quarantine directory
- WHY.md examples
- LEDGER.jsonl evidence

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
