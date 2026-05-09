# Floyd's Unified Command Kernel

One command surface. Every Legacy AI capability wired into it. Built in a garage because the existing options annoyed us.

The authoritative plan, architecture rules, beta gates, and remaining work live in:

```text
SSOT/control-center_SSOT.md
```

Read that SSOT before making product, route, port, module, or documentation changes. Seriously. Read it. We'll know if you didn't.

## What This Thing Is

Floyd's Unified Command Kernel (the Kernel, for short) is one application. Not a shell, not a launcher, not a collection of iframes wearing a trench coat and pretending to be integrated.

Every capability — terminals, workspace editing, agent execution, system health, infrastructure mapping, project governance — gets copied into this monorepo and adapted as a Kernel-owned internal module. The originals stay standalone and untouched. Iframes and adapters are temporary scaffolding, not finished work.

## Current State

- Product: Floyd's Unified Command Kernel
- Runtime posture: single-user localhost during beta construction
- Primary app port: `10527`
- Backend: FastAPI (Python)
- Frontend: zero-build vanilla JavaScript
- Phase: Mid-construction toward beta release

## Run Locally

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

112 tests should pass. Three workflow tests need Playwright browsers installed — run `.venv/bin/playwright install` if you want those too.

## Architecture Rules

1. The Kernel is one product. Old app names are provenance, not product labels.
2. Source apps get copied in, then adapted. Not rewritten from memory.
3. Original source apps remain standalone. Don't mutate them.
4. Iframes are temporary bridges. They are not finished integration.
5. All user-facing names, routes, and ports are Kernel-native.

For beta readiness gates, see the gate table in `SSOT/control-center_SSOT.md`.
