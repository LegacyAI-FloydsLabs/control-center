# Dashboard

Dashboard is the new Legacy AI monoapplication under construction in this repository.

The authoritative plan, architecture rules, beta gates, and remaining work live in:

```text
SSOT/control-center_SSOT.md
```

Read that SSOT before making product, route, port, module, or documentation changes.

## Current identity

- Product: Dashboard
- Implementation directory: `control-center/`
- Runtime posture: single-user localhost during beta construction
- Primary app port: `10527`
- Backend: FastAPI
- Frontend: zero-build vanilla JavaScript

## Architecture rule

Dashboard is one application. Existing applications are source packages whose actual code is copied into this monorepo, then adapted as Dashboard-owned internal capabilities. Original applications remain standalone and untouched.

Iframes, launchers, and adapters are temporary migration bridges only. They are not beta-complete integration.

## Run locally

```bash
make venv
make run
```

Then open:

```text
http://localhost:10527/
```

## Verify

```bash
.venv/bin/python -m pytest -v
```

For beta readiness, use the gate table in `SSOT/control-center_SSOT.md`.
