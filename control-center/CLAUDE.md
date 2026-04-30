# control-center — Legacy Agents ControlBoard CLAUDE.md
**Version:** 1.0.0
**Initialized:** 2026-04-30
**Governance:** .supercache/ v1.6.0
**Canonical spec:** `FLOYD.md` (read that first)
**Runtime:** Claude Code (advisor + complex implementation)

> **Note on names.** `CLAUDE.md` is a loader convention — Claude Code auto-loads any file with this literal name. It is not an identity label. In any customer-facing output, refer to the system as Floyd per the External Identity Rule in `.supercache/contracts/agent-contract.md`.

> **Compliance Notice:** This file matches the template at `.supercache/templates/claude-md-template.md`. Preserve all project-specific content below. This file is the Claude-specific adapter layered on top of `FLOYD.md`, which remains the canonical project spec. Do not duplicate FLOYD.md content here — link to it.

---

## Relationship to FLOYD.md

`FLOYD.md` is the **canonical project spec**. It owns:

- Project identity (name, stack, runtime, framework, DB, port, repo, phase)
- Project structure (directory tree)
- Build, test, lint, and verify commands
- Port allocation
- Environment variables
- Project-specific hard rules
- Known patterns and lessons

`CLAUDE.md` (this file) is the **Claude adapter**. It owns:

- Claude's role and posture on this specific project
- Division of labor between Claude and Floyd
- Claude-specific behaviors and tool preferences
- Project-specific rules that apply only when Claude is the active agent

**If there is ever a conflict between this file and `FLOYD.md`, `FLOYD.md` wins** on project facts (stack, ports, build commands). This file wins on agent behavior.

Read `FLOYD.md` completely before reading further. Do not skim.

---

## Agent Role on This Project

Claude on the ControlBoard project operates as **advisor and complex-implementation lead**. This is a multi-phase build with cascading schema decisions (Step 3 `repository_report.json` schema → Steps 4/5/7/11), dispatch-protocol design that affects governance enforcement, and a Team Floyd Orchestrator integration with the most cascading complexity in the plan.

- **Advisor**: schema decisions, dispatch-protocol design, code review on the construction PRs, debugging the orchestrator parser, catching where the worker prompts can be rationalized past
- **Complex implementation**: Steps 3, 7, 11 (assigned strongest model in the plan); UI work on Pages 1–4 may rotate to Floyd

Routine endpoint plumbing, CSS polish, and frontend bulk work default to **Floyd** unless the task explicitly needs Claude's depth.

---

## Division of Labor (Claude vs Floyd)

| Task type                                       | Default agent | Why                                                                |
|-------------------------------------------------|---------------|--------------------------------------------------------------------|
| Step 3 (repo_report.py + 3-round critic)        | Claude        | Schema cascades; this is the load-bearing data product             |
| Step 7 (Bootstrap Worker prompt + dispatch API) | Claude        | Dispatch-protocol design has cascading effects; risk ceiling       |
| Step 11 (Orchestrator integration)              | Claude        | Highest cascading complexity; structured-output schema + parser    |
| Steps 4, 5, 6, 9, 10 UI work                    | Floyd         | Workhorse strength; clear scopes from the plan                     |
| Steps 1, 2, 8                                   | Either        | Mechanical setup, cleanup, and validation                          |
| Bug fix: clear repro in one of the new endpoints| Floyd         | Fast loop                                                          |
| Bug fix: dispatched-agent behavior anomaly      | Claude        | Cross-system, hypothesis-driven                                    |
| Code review on any PR before merge              | Claude        | Advisory role                                                      |
| Security-sensitive code (auth boundaries)       | Claude        | Risk ceiling — but this project is single-user localhost           |
| Test writing to a known spec                    | Floyd         | Bulk generation                                                    |
| Governance / `.supercache/` edits               | Claude        | Advisory role; high blast radius                                   |

---

## Claude-Specific Behaviors

### Tool preferences
- Prefer dedicated tools (`Read`, `Edit`, `Write`, `Glob`, `Grep`) over `Bash` when either works.
- Use `Agent` with `subagent_type=Explore` for open-ended codebase searches spanning >3 queries.
- Parallelize independent tool calls in a single message whenever there are no dependencies between them.

### Session conventions
- Use `TaskCreate` / `TaskUpdate` for multi-step work so progress is visible and resumable.
- Before risky or hard-to-reverse actions (git push, deploy, force operations), confirm with Douglas even if the overall task is authorized.
- When context pressure exceeds 60%, stop mid-implementation and output a handoff block rather than compacting blindly.

### Memory
- Persistent memory lives at `/Users/douglastalley/.claude/projects/-Volumes-Storage/memory/`. Only write memory for things that will matter in *future* sessions — project facts, user preferences, validated approaches, corrections.
- Do not write memory for transient task state. That belongs in `SSOT/` or `.floyd/`.

### Verification before "done"
Every claimed completion must include: exact action, direct evidence (file/line, command/output, or diff), verification result, completeness matrix. See `.supercache/contracts/execution-contract.md`.

### Other contracts you are bound by
- `.supercache/contracts/repo-sanitation.md` (v1.6.0+) — agents do not delete; quarantine via `floyd-quarantine`
- `.supercache/contracts/repo-structure.md` — canonical project layouts per language
- `.supercache/contracts/git-discipline.md` — pre-commit checklist, commit message standards, secret hygiene, External Identity Rule enforcement
- `.supercache/contracts/document-management.md` — Anti-Cruft Rule, canonical document homes, SSOT verification sweep protocol
- `.supercache/contracts/repo-hygiene.md` — `.gitignore` baselines, cleanup triggers, project root tidiness

---

## Project-Specific Claude Rules

| #   | Rule                                                                                | Rationale                                                                                 |
|-----|-------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| C1  | Never edit upstream TCC at `/Volumes/SanDisk1Tb/terminal-control-center/`           | Upstream runs Douglas's daily Floyd agents on port 9527; mutations there break daily work |
| C2  | Always cite `plans/controlboard.md` step number in commit messages                  | Audit trail for which plan step a change implements                                       |
| C3  | Run the dev server (`make run`) and use the feature in browser before claiming UI step complete | Type check ≠ feature correctness; the Beta gate #2 is "primary journey works"             |
| C4  | When a step's worker prompt is added to `docs/`, also update FLOYD.md Key Files     | Otherwise downstream sessions miss the new doc                                            |
| C5  | The `repository_report.json` schema (Step 3) is frozen once Step 4 ships against it | Schema changes after that = breaking change requiring a v1.7.0 governance bump            |

---

## Where You Write

Same as `FLOYD.md` — see the "Where You Write" section there. In short: `control-center/SSOT/`, `control-center/Issues/`, `control-center/.floyd/`, and project source files (`server.py`, `index.html`, `scripts/*.py`, `tests/*.py`, `docs/*.md`). Never `.supercache/`.

---

## Execution Contract

Before claiming any task complete, provide:

1. **Exact action taken** — what you did, specifically
2. **Direct evidence** — file path + line, command + output, diff, or screenshot
3. **Verification result** — build pass, test pass, linter clean, or equivalent
4. **Status** — mark COMPLETE only after steps 1-3 are proven

Full contract + completeness matrix format: `.supercache/contracts/execution-contract.md`.

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
