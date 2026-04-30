"""Shared pytest fixtures for TCC tests."""

from __future__ import annotations

import os
import pytest

from _helpers import base_url, is_server_up, ARTIFACTS_DIR


@pytest.fixture(scope="session", autouse=True)
def _ensure_server_up():
    """Skip the entire suite if the server isn't already running.

    Tests do NOT start the server themselves — they assume a live launchd-managed instance on
    port 9527. This avoids accidentally killing the user's daily-driver session.
    """
    if not is_server_up(timeout=2.0):
        pytest.skip(f"TCC server not reachable at {base_url()} — start it before running tests")


@pytest.fixture(scope="session")
def tcc_base() -> str:
    return base_url()


@pytest.fixture(scope="session")
def headed() -> bool:
    return os.environ.get("HEADED", "0") == "1"


@pytest.fixture
def artifacts_dir(request) -> str:
    """Per-test artifacts directory. Cleaned at fixture teardown only on success."""
    name = request.node.name.replace("[", "_").replace("]", "").replace("/", "_")
    target = ARTIFACTS_DIR / name
    target.mkdir(parents=True, exist_ok=True)
    return str(target)
