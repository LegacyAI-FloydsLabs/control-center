"""Tests for the Infrastructure Cartography embed (Step 13).

Verifies the vendored infrastructure-map.html file is present, served by the
StaticFiles mount at /static/infrastructure-map.html, and renders the expected
diagram content (sanity checks against known headings + provider cards).
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

import server  # noqa: E402


# Bypass conftest's autouse server-required fixture for in-process tests.
@pytest.fixture(scope="module", autouse=True)
def _ensure_server_up():  # type: ignore[no-redef]
    yield


@pytest.fixture
def client() -> TestClient:
    return TestClient(server.app)


VENDORED_MAP = ROOT / "static" / "infrastructure-map.html"


def test_vendored_file_exists() -> None:
    """The vendored map must be checked in alongside the project."""
    assert VENDORED_MAP.is_file(), f"missing {VENDORED_MAP} — run scripts/refresh-infrastructure-map.sh"


def test_vendored_file_size() -> None:
    """Sanity-check the file is non-trivially sized."""
    size = VENDORED_MAP.stat().st_size
    assert 30_000 < size < 200_000, f"unexpected size: {size}"


def test_vendored_file_has_doctype() -> None:
    head = VENDORED_MAP.read_text()[:64]
    assert head.lower().startswith("<!doctype html>")


def test_static_endpoint_serves_map(client: TestClient) -> None:
    resp = client.get("/static/infrastructure-map.html")
    assert resp.status_code == 200
    assert "html" in resp.headers.get("content-type", "").lower()


def test_map_contains_provider_anchors(client: TestClient) -> None:
    """The diagram covers the core providers — make sure they're still in the embed."""
    body = client.get("/static/infrastructure-map.html").text
    for token in ("Vercel", "Hostinger", "Supabase", "DigitalOcean", "GitHub"):
        assert token in body, f"provider {token!r} missing from infrastructure map"


def test_index_html_embeds_iframe(client: TestClient) -> None:
    """The Embed tab in the ControlBoard must reference the static map URL."""
    body = client.get("/").text
    assert 'id="cb-infra-iframe"' in body
    assert 'src="/static/infrastructure-map.html"' in body
    # Tab label should be Infrastructure (not the original "Embed" placeholder)
    assert ">Infrastructure<" in body


def test_refresh_script_present() -> None:
    """The vendor refresh script is part of the project."""
    script = ROOT / "scripts" / "refresh-infrastructure-map.sh"
    assert script.is_file()
    # Must be executable (0o755)
    assert script.stat().st_mode & 0o111, "refresh script is not executable"


def test_docs_present() -> None:
    """The old vendoring doc is inactive; Dashboard SSOT is canonical."""
    doc = ROOT / "docs" / "infrastructure-map.md"
    assert not doc.exists()
    ssot = ROOT / "SSOT" / "control-center_SSOT.md"
    issues = ROOT / "Issues" / "control-center_ISSUES.md"
    assert ssot.is_file()
    assert issues.is_file()
    assert "System Map" in ssot.read_text()
    assert "ISSUE-0001" in issues.read_text()
