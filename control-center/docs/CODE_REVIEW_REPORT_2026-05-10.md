# Control Center Code Review Report

**Date:** 2026-05-10  
**Target:** Current `main` branch of `LegacyAI-FloydsLabs/control-center`  
**Review mode:** EXPLORE / repository health audit  
**Reviewer posture:** correctness, security, maintainability, testing, operational behavior

---

## Executive Summary

The Control Center is shipping real functionality, but the backend has a few load-bearing correctness and safety problems that should be fixed before more features get stacked on top of it.

### Verdict

**REQUEST_CHANGES**

### Why

Three issues are severe enough to block clean approval:

1. `POST /api/import` is registered twice for two different behaviors.
2. Bootstrap/finisher execution uses `shell=True` with command strings built from filesystem paths.
3. `/api/fs/remove` can recursively delete allowlisted roots such as `/Volumes/Storage` or the user's home directory.

The remaining items are not immediate stop-ship bugs, but they are actively increasing maintenance cost and confusion.

---

## Automated Check Summary

| Check | Result | Evidence |
|---|---|---|
| LSP diagnostics (`server.py`) | PASS | No diagnostics reported by LSP |
| GitHub repo health | PASS | Repo exists, public, default branch `main` |
| `pytest -x -q` | FAIL | `tests/dogfood_test.py` requires missing `page` fixture |
| TODO/stub scan | PASS-ish | No generic TODO/FIXME noise; the real issues are live code, not markers |

### Pytest failure receipt

Command:

```bash
cd "/Volumes/Storage/Legacy Agents/control-center" && .venv/bin/python -m pytest -x -q
```

Observed failure:

- `tests/dogfood_test.py:104` — `fixture 'page' not found`
- `requirements-dev.txt` does not include `pytest-playwright`

---

## Findings

## 1. BLOCKER — Duplicate `POST /api/import` route means one behavior shadows the other

### Evidence

- `server.py:2318` defines agent backup import:
  - `@app.post("/api/import")`
  - `async def import_agents(agent_list: List[dict])`
- `server.py:3086` defines Dev Launcher proxy on the same path:
  - `@app.api_route("/api/import", methods=["GET", "POST"])`
  - `async def proxy_import(request: Request)`

These are two different behaviors on the same HTTP method + path.

### Why this is bad

This is a correctness bug, not a style nit. One of these handlers will shadow the other depending on route registration and framework matching behavior. That means either:

- agent import backups are broken, or
- Dev Launcher import proxying is broken, or
- both behaviors become fragile and order-dependent.

### Exact fix to apply

**Do not share global `/api/import` for two unrelated concepts.**

#### Apply this route split:

- Keep agent backup import at:
  - `POST /api/import`
- Move Dev Launcher import proxy to a namespaced route:
  - `GET|POST /api/dev-launcher/import`

#### Concrete code changes

1. In `server.py`, change:

```python
@app.api_route("/api/import", methods=["GET", "POST"])
async def proxy_import(request: Request):
    return await _proxy_dev_launcher("/api/import", request)
```

To:

```python
@app.api_route("/api/dev-launcher/import", methods=["GET", "POST"])
async def proxy_import(request: Request):
    return await _proxy_dev_launcher("/api/import", request)
```

2. Update the Dev Launcher frontend or proxy consumer to call `/api/dev-launcher/import` instead of `/api/import`.
3. Add one regression test covering both behaviors explicitly:
   - `POST /api/import` imports agents
   - `POST /api/dev-launcher/import` forwards to Dev Launcher backend

---

## 2. BLOCKER — Bootstrap and finisher endpoints execute shell commands with `shell=True`

### Evidence

- `server.py:3604-3607` builds shell command strings from `project_dir`
- `server.py:3622-3628` launches with `_subprocess_we.Popen(..., shell=True, ...)`
- `server.py:3671` builds `make {target}` strings
- `server.py:3680-3687` runs `_subprocess_we.run(..., shell=True, ...)`

### Why this is bad

This code is currently depending on shell quoting to protect values derived from filesystem paths.

Problems:

- `project_dir` is interpolated into shell strings.
- A single quote in a directory name breaks the quoting model.
- `shell=True` expands the attack surface for command injection and quoting bugs.
- Operationally, shell pipelines are harder to reason about and harder to test.

Even if current directory names are "safe enough," this is still the wrong abstraction boundary.

### Exact fix to apply

**Stop building shell strings. Execute argv lists directly.**

#### For bootstrap

Replace string-building logic like:

```python
commands.append(f"cd '{project_dir}' && make bootstrap 2>&1 || make verify 2>&1 || make test 2>&1")
```

With structured command attempts such as:

```python
command_attempts = [
    ["make", "bootstrap"],
    ["make", "verify"],
    ["make", "test"],
]
```

Then run each with:

```python
_subprocess_we.run(
    argv,
    cwd=project_dir,
    capture_output=True,
    text=True,
    timeout=60,
)
```

#### For bootstrap script

Replace:

```python
commands.append(f"bash {bootstrap_script}")
```

With:

```python
command_attempts.append(["bash", bootstrap_script])
```

#### For finisher

Replace `shell=True` calls with direct argv execution:

```python
_subprocess_we.run(["make", target], cwd=project_dir, capture_output=True, text=True, timeout=60)
```

#### Additional hardening

- Validate that `project_dir` remains under approved roots after resolution.
- Return structured fields (`attempted_targets`, `selected_target`, `stdout`, `stderr`) instead of shell-shaped output blobs.

---

## 3. BLOCKER — `/api/fs/remove` can recursively delete entire allowlisted roots

### Evidence

- Allowlist accepts root equality in `server.py:1087-1096`
  - `_we_assert_allowed()` returns success when `resolved == r` **or** `resolved.startswith(r + "/")`
- Delete handler uses recursive delete directly in `server.py:1271-1279`
  - directory path → `_shutil.rmtree(path)`
  - file path → `os.unlink(path)`

### Why this is bad

Right now, these are legal delete targets if requested directly:

- `/Volumes/Storage`
- `/Volumes/SanDisk1Tb`
- the user's home directory
- cloud storage roots
- `/tmp`

Because `_we_assert_allowed()` allows equality with the root itself, `/api/fs/remove` is one bad request away from catastrophic deletion.

### Exact fix to apply

**Protect allowlisted roots and only allow deletes strictly below them.**

#### Change `_we_assert_allowed()` semantics

For destructive operations, root equality must not be enough.

Create a dedicated helper for destructive paths, for example:

```python
def _we_assert_destructive_allowed(p: str) -> None:
    resolved = str(_PathLibWE(p).resolve())
    for r in _WE_DENY_ROOTS:
        if resolved == r or resolved.startswith(r + "/"):
            raise HTTPException(status_code=403, detail=f"Path denied: {resolved}")
    for r in _WE_ALLOWED_ROOTS:
        if resolved.startswith(r + "/"):
            return
    raise HTTPException(status_code=403, detail=f"Path not allowed for delete: {resolved}")
```

Then use that helper in:

- `we_fs_remove`
- any future destructive move/rename APIs if they can replace root-level paths

#### Also add explicit protected roots

Refuse deletion of these exact resolved paths even if they otherwise pass:

- each item in `_WE_ALLOWED_ROOTS`
- repo root
- active working directory
- any configured vault/config file directory roots

#### Add regression tests

- deleting `/Volumes/Storage` → `403`
- deleting `/Users/<user>` → `403`
- deleting `/Volumes/Storage/project/tmp.txt` → allowed if inside root

---

## 4. WARNING — Default test run is broken because `dogfood_test.py` depends on a missing Playwright fixture

### Evidence

- `tests/dogfood_test.py:104` defines `def test_shell(page: Page):`
- pytest error shows fixture `page` not found
- `requirements-dev.txt:3-10` does **not** include `pytest-playwright`
  - only a commented `playwright>=1.40`

### Why this is bad

A fresh `pytest` run fails immediately, even though the rest of the suite appears to keep passing once the E2E layer is skipped. That means the default developer feedback loop is lying:

- the repo looks testable,
- but the default test command is broken,
- and the fix is tribal knowledge.

### Exact fix to apply

Pick one of these two paths and be explicit:

### Preferred fix

Treat dogfood as optional E2E, not part of the default unit/integration suite.

1. Add `pytest.ini`:

```ini
[pytest]
markers =
    e2e: browser-driven end-to-end tests
```

2. At the top of `tests/dogfood_test.py`, add:

```python
import pytest
pytestmark = pytest.mark.e2e
```

3. Add `pytest-playwright>=0.5` to `requirements-dev.txt`.
4. Document two commands:

```bash
pytest -m "not e2e"
playwright install
pytest -m e2e
```

### Acceptable fallback

If this file is really a manual dogfood script, stop pretending it is a default pytest module:

- rename `dogfood_test.py` → `dogfood_manual.py`
- invoke it explicitly as a script

---

## 5. WARNING — Dev Launcher proxy blocks the event loop and hardcodes local backend port 4500

### Evidence

- `server.py:3015` hardcodes `_DEV_LAUNCHER_PORT = 4500`
- `server.py:3026-3063` uses `urllib.request.urlopen(...)` inside an async route handler
- on backend absence, the route returns raw exception text in a 502 JSON string

### Why this is bad

There are three separate problems here:

1. **Blocking I/O in async handler** — `urllib.request` blocks the event loop.
2. **Hardcoded operational dependency** — the port is fixed at 4500.
3. **Poor failure contract** — users get raw connection-refused text instead of a structured "Dev Launcher backend unavailable" response.

This is already visible in practice: a missing local backend turns the feature into a confusing transport error.

### Exact fix to apply

1. Replace `urllib.request` with `httpx.AsyncClient`.
2. Make the backend port configurable:

```python
_DEV_LAUNCHER_PORT = int(os.getenv("DEV_LAUNCHER_PORT", "4500"))
```

3. Return a structured service-unavailable response on connection failure:

```python
return JSONResponse(
    status_code=503,
    content={
        "error": "Dev Launcher backend unavailable",
        "target": target,
        "hint": "Start the Dev Launcher backend or configure DEV_LAUNCHER_PORT",
    },
)
```

4. Add a health endpoint or preflight check so the UI can render a useful "backend offline" state instead of surfacing transport errors.

---

## 6. SUGGESTION — Branding scrub is incomplete: `.fuck-hero` still exists in live HTML and tests

### Evidence

- `index.html:944-948` defines `.fuck-hero`
- `index.html:2440-2442` renders `<img ... class="fuck-hero">`
- `tests/dogfood_test.py:135-144` still looks up `img.fuck-hero`

### Why this matters

This is not a functional bug, but it is inconsistent with the current branding direction and guarantees that future cleanup work has to remember an internal joke name after public docs have already been scrubbed.

### Exact fix to apply

Rename consistently:

- `.fuck-hero` → `.kernel-hero` in `index.html`
- `img.fuck-hero` → `img.kernel-hero` in `tests/dogfood_test.py`
- update any generated snapshots or artifact checks that key off the class name

This is low-risk and should be done opportunistically with the next UI touch.

---

## Recommended Fix Order

1. **Fix route collision** (`/api/import`) — prevents undefined behavior.
2. **Remove `shell=True` from bootstrap/finisher** — closes execution risk.
3. **Protect destructive filesystem roots** — closes catastrophic delete path.
4. **Repair test strategy for dogfood E2E** — restores trustworthy `pytest` behavior.
5. **Modernize Dev Launcher proxy** — improves operational clarity and async correctness.
6. **Finish branding scrub in source/test selectors** — cleanup and consistency.

---

## Files Reviewed

- `control-center/server.py`
- `control-center/tests/dogfood_test.py`
- `control-center/requirements-dev.txt`
- `control-center/index.html`
- GitHub repo metadata (`LegacyAI-FloydsLabs/control-center`)

---

## Bottom Line

The project's biggest risk is not syntax or type breakage — it's backend surface area that has grown faster than its boundaries.

The Control Center is doing real work, but some routes and subprocess edges are still behaving like a prototype. Fix those edges now, before they become invariants that everything else has to tiptoe around.


---

## Appendix A — Review of Provided `enterprise-bug-hunt-knowledge-retrieval` Skill

This appendix reviews the skill definition supplied after the main code review. This is a prompt/spec review, not an application-code review.

### A1. BLOCKER — Signal-quality gate is mathematically and procedurally inconsistent

#### Evidence

The skill currently says all of the following:

- Description promises `98%+ signal quality`
- Execution checklist only requires `signal rate >= 95%`
- Quality gate says first three criteria are `Required` and marked `YES`
- Pass threshold is `65 points (any YES item + at least 2 Preferred items)`

Those statements cannot all be true at once:

- The first three required criteria already total **65 points** (`25 + 20 + 20`).
- The written threshold text says `any YES item + at least 2 Preferred items`, which does **not** add up to 65.
- The document promises `98%+` quality while the operational gate only enforces `>= 95%`.

#### Why this is bad

Reviewers and downstream agents will not know which rule is authoritative, and different runs will accept different quality bars for the same corpus.

#### Exact fix to apply

Replace the current pass logic with one canonical rule set. Recommended rewrite:

```markdown
### Phase 3: Quality Gate

Every extracted item MUST satisfy all required criteria:

- Contains reproduction or exploitation steps
- Maps to a CWE or OWASP category
- Identifies the affected technology, parameter, endpoint, or asset class

Scoring:

- Required criteria: 65 points total
- Preferred criteria add confidence but do not replace required criteria

Pass threshold: 75 points total, including all required criteria and at least one preferred criterion.
Repository-level target signal rate: >= 98%.
```

Also change the final checklist line from:

```markdown
- [ ] Final: Verify signal rate >= 95%
```

To:

```markdown
- [ ] Final: Verify signal rate >= 98%
```

### A2. BLOCKER — The stealth protocol contains active anti-detection and fingerprint-evasion instructions

#### Evidence

The skill explicitly instructs the agent to:

- hide `navigator.webdriver`
- randomize Canvas and WebGL fingerprints
- use residential proxies
- rotate sessions/subnets
- scrape sites with anti-bot controls until blocked

#### Why this is bad

This is not just brittle — it is operationally and legally risky. It turns a knowledge-retrieval skill into an evasion playbook. That is the wrong default for a reusable enterprise research skill.

It also conflicts with other parts of the document that say to prefer APIs, stop on CAPTCHA, and use scraping only as a last resort.

#### Exact fix to apply

Replace the entire `7-Layer Data Collection Stealth Protocol` section with a compliance-safe collection policy:

```markdown
## Collection Safety Protocol

1. Prefer public APIs, official exports, raw GitHub content, and public documentation.
2. Use browser automation only for pages that require rendering.
3. Respect robots, rate limits, and published terms.
4. Do not attempt fingerprint evasion, CAPTCHA bypass, proxy rotation, or anti-bot circumvention.
5. If blocked, stop and switch sources.
6. Log blocked sources as unavailable rather than retrying aggressively.
```

Also delete the following instructions entirely:

- `Hide navigator.webdriver`
- `Randomize Canvas and WebGL fingerprints`
- `Enable residential proxies`
- `Per-session rotation with subnet diversity`

### A3. WARNING — Crawl-budget rules contradict the expected yield and the repository/API ingestion model

#### Evidence

The skill says:

- `Max 2 requests/min per domain`
- `Max 5 pages per domain per session`

But it also claims expected yields such as:

- `PortSwigger Academy | 100+ lab techniques`
- `Nuclei Templates | 500+ detection patterns`
- `PayloadsAllTheThings | 200+ payload categories`

Those targets are not achievable under a blanket five-page-per-domain rule, especially when some sources are Git repositories or APIs rather than interactive sites.

#### Why this is bad

An agent following the spec literally will either fail coverage or violate the spec to finish the job.

#### Exact fix to apply

Split collection policies by source type. Recommended replacement:

```markdown
### Rate Limits by Source Type

- Public APIs (NVD, GitHub API): follow API quotas; bulk retrieval allowed.
- Git clones / raw GitHub content: repository-level fetch allowed; no page-count limit.
- Interactive documentation sites: 2 requests/minute per domain, 5-15 pages per session unless explicitly approved.
- Anti-bot protected sites: do not scrape unless explicit authorization exists.
```

That preserves caution on rendered sites without making repository-scale collection impossible.

### A4. WARNING — Source tiers are misclassified; `HackerOne Hacktivity` should not be Tier 1 authoritative

#### Evidence

The skill lists `HackerOne Hacktivity (disclosed)` under `Tier 1: Authoritative — Always Extract (95%+ signal)`.

#### Why this is bad

Disclosed bug bounty reports are often high-value, but they are not authoritative in the same sense as OWASP, CWE, PortSwigger, or NVD. Disclosure quality varies wildly, reproduction depth is inconsistent, and redactions often remove the exact technical details the skill claims to require.

#### Exact fix to apply

Move HackerOne disclosed reports into Tier 2 and tighten the validation rule. Replace:

```markdown
| HackerOne Hacktivity (disclosed) | ... | Real disclosed reports | Scrape disclosed reports with reproduction steps |
```

With:

```markdown
| HackerOne Hacktivity (disclosed) | ... | Real disclosed reports | Fetch only disclosed reports that include reproduction steps, affected asset context, and remediation or impact detail |
```

And place it under `Tier 2: High Signal — Extract with Validation`.

### A5. WARNING — Output schema is inconsistent with the aggregation model

#### Evidence

The skill says to merge content into domain-level files such as:

- `VULNERABILITY_PATTERNS_[CATEGORY].md`
- `TESTING_METHODOLOGY_[DOMAIN].md`

But the output template uses file-level metadata that assumes a single source per file:

```markdown
*Retrieved: [date] | Source: [url] | Signal Score: [N]/100*
```

#### Why this is bad

A domain file assembled from many sources cannot honestly claim one source URL or one signal score. That destroys provenance and makes later dedup/audit work harder.

#### Exact fix to apply

Move provenance metadata down to the entry level. Recommended structure:

```markdown
# [Knowledge Domain Title]

## [Vulnerability Category]

### [Specific Vulnerability]
- **Source URL**: ...
- **Retrieved**: ...
- **Signal Score**: ...
- **CWE**: ...
- **Affected Tech**: ...
- **Exploitation Steps**:
  1. ...
- **Payload/POC**: ...
- **Remediation**: ...
```

If you want file-level metadata, make it aggregate-only, for example:

```markdown
*Sources included: 27 | Retrieval window: 2026-05-10 | Average signal score: 84/100*
```

### A6. SUGGESTION — Deduplication rules are underspecified for a multi-source corpus

#### Evidence

The skill says:

- `Normalize CWE references`
- `Merge duplicate entries (same vuln, same target, same technique)`

But it never defines a canonical dedup key.

#### Why this matters

Without a stable merge key, two agents can ingest the same material in different shapes and produce duplicate knowledge entries that look unique.

#### Exact fix to apply

Add a canonical dedup key specification such as:

```markdown
Dedup key = SHA256(normalized_title + canonical_cwe + normalized_affected_tech + normalized_source_url + normalized_primary_payload)
```

And add a fallback merge policy:

```markdown
If the source URL differs but the dedup key matches except for source URL, preserve one primary entry and append additional sources under `Corroborating Sources`.
```

## Recommended Edit Order for the Skill

1. Fix the signal-quality contract and thresholds.
2. Remove fingerprint-evasion / anti-detection guidance.
3. Split rate limits by source type.
4. Reclassify HackerOne disclosures to Tier 2.
5. Move provenance metadata to the entry level.
6. Add a canonical dedup key.
