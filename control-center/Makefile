.PHONY: install venv run dev clean help test test-api test-ui test-proof secret-scan

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-14s %s\n", $$1, $$2}'

venv: ## Create virtual environment and install dependencies
	python3 -m venv .venv
	.venv/bin/pip install -r requirements.txt

install: ## Install Python dependencies (requires active venv — use 'make venv' first)
	pip install -r requirements.txt

run: ## Start the ControlBoard server on port 10527 (or PORT env var)
	python server.py

dev: ## Start with auto-reload (development)
	uvicorn server:app --host 0.0.0.0 --port 10527 --reload

clean: ## Remove runtime artifacts
	rm -rf __pycache__ static/*.tmp .venv

test: test-api test-ui test-automation ## Run the full non-proof test suite (API + UI + automation)

test-api: ## Fast HTTP smoke tests against a running server
	.venv/bin/pytest tests/test_api_smoke.py -v

test-ui: ## Headless Playwright tests for the top-3 human workflows
	.venv/bin/pytest tests/test_workflows_ui.py -v

test-automation: ## End-to-end CRON + launchd integration tests (skips slow cron fire)
	SKIP_SLOW_CRON=1 .venv/bin/pytest tests/test_automation_e2e.py -v

test-automation-slow: ## Full automation suite including 75s real-time cron fire
	.venv/bin/pytest tests/test_automation_e2e.py -v

test-proof: ## 10/10 close→reopen→headed-floyd proof (bounces server, headed mode)
	RUN_PROOF=1 .venv/bin/pytest tests/test_proof_floyd.py -v -s

secret-scan: ## Scan tracked files for credential patterns (CI-friendly)
	./scripts/secret-scan.sh