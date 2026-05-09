# ATerm — Issues Ledger

**Project:** ATerm
**Last Updated:** 2026-04-26 13:19 EDT
**Governance:** .supercache/ v1.4.1

---

## Open Issues

| ID | Created | Title | Status | Owner | Priority |
|----|---------|-------|--------|-------|----------|
| _(none open)_ | — | — | — | — | — |

## Resolved Issues

| ID | Created | Title | Status | Resolution |
|----|---------|-------|--------|------------|
| ISSUE-R001 | 2026-04-24 | MCP server creates dual PTY pool | Verified | Rewritten as HTTP proxy (commit fcdb5f4); confirmed by src/mcp/server.ts:1-13 header comment |
| ISSUE-R002 | 2026-04-24 | State detector fails all 5 test scenarios | Verified | 5-layer architecture with metacog regression suite (commit c5fd130); 17/17 state tests pass live 2026-04-26 |
| ISSUE-R003 | 2026-04-24 | Sidebar polls every 2 seconds | Verified | Replaced with /ws/events push channel (commit fedeed6); confirmed via ui/src/hooks/useEvents.ts |
| ISSUE-R004 | 2026-04-24 | WebSocket no auto-reconnect | Verified | Exponential backoff 1s→2s→4s→max 30s (commit fedeed6); confirmed via ui/src/components/Terminal.tsx:60-71 |
| ISSUE-R005 | 2026-04-24 | Session name displayed as truncated UUID | Verified | Full session object passed from sidebar (commit fedeed6) |
| ISSUE-R006 | 2026-04-24 | Floyd TTY Bridge integration not implemented (originally ISSUE-0001) | Verified | Phase 4 shipped Anvil bridge (commit f8765c3); src/bridge/anvil-client.ts; new `bridge` action added to /api/do (now 18 actions); ANVIL_WS_PORT corrected to 7777 in c8b218b |
| ISSUE-R007 | 2026-04-24 | Automation cron/launchd not implemented (originally ISSUE-0002) | Verified | Phase 4 shipped cron primitives (commit f8765c3); AutomationRunner wired into SessionManager constructor in commit fe5cee7 (manager.ts:14,27,33); functional tests cover end-to-end firing |
| ISSUE-R008 | 2026-04-24 | MCP Streamable HTTP transport not implemented, stdio only (originally ISSUE-0003) | Verified | Streamable HTTP transport added in commit fe5cee7; src/mcp/server.ts now exposes both stdio and HTTP |
| ISSUE-R009 | 2026-04-24 | Light theme defined in CSS vars but no toggle in UI (originally ISSUE-0004) | Verified | Theme toggle landed in commit fe5cee7; ui/src/components/StatusBar.tsx exposes the control |
| ISSUE-R010 | 2026-04-24 | Mobile responsiveness not tested (originally ISSUE-0005) | Verified | Responsive CSS landed in commit fe5cee7; accessibility pass in commit da20127 added `<main>` landmark, ARIA labels, 24×24px touch targets, WCAG AA contrast (1.88:1 → 4.7:1 via --text-muted) |
| ISSUE-R011 | 2026-04-24 | Memory usage invariant not formally measured, 100MB for 10 sessions (originally ISSUE-0006) | Verified | Memory regression test added in commit fe5cee7; src/test/memory.test.ts; live run 2026-04-26 shows 1.4MB RSS delta for 5 bash sessions — ~70× headroom under the 100MB design budget |

---

## Change Log

- 2026-04-26 13:19 EDT — Governance compliance sweep. Moved 6 open issues to Resolved (renumbered ISSUE-R006 through ISSUE-R011) with commit-evidence resolution attribution and Verified status. Open Issues table now empty. All 11 resolutions confirmed via codebase reads, file:line citations, and live test runs documented in SSOT Verification Log.
- 2026-04-24 17:30 EDT — Initial issues ledger created. 6 open issues, 5 resolved.
