"""Tests for the MWIDE embed (Step 9).

The actual MWIDE service runs in a separate project at
/Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE/ — we don't start it from here.
These tests verify only the embed plumbing on the ControlBoard side: the
tab is registered, the iframe targets port 10602, and the fallback markup
is present for when MWIDE is offline.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

import server  # noqa: E402


@pytest.fixture(scope="module", autouse=True)
def _ensure_server_up():  # type: ignore[no-redef]
    yield


@pytest.fixture
def client() -> TestClient:
    return TestClient(server.app)


def test_index_html_has_mwide_tab(client: TestClient) -> None:
    body = client.get("/").text
    assert ">MWIDE<" in body
    assert 'id="cb-tab-mwide"' in body
    assert 'id="cb-page-mwide"' in body


def test_index_html_iframe_targets_port_10602(client: TestClient) -> None:
    """The MWIDE_URL constant in the JS or the iframe src must reference 10602."""
    body = client.get("/").text
    assert "MWIDE_URL = 'http://localhost:10602/'" in body or 'src="http://localhost:10602' in body


def test_index_html_iframe_has_sandbox_attributes(client: TestClient) -> None:
    body = client.get("/").text
    # Iframe must permit scripts + same-origin so MWIDE's WebSocket plumbing works
    assert 'id="cb-mwide-iframe"' in body
    assert "allow-scripts" in body
    assert "allow-same-origin" in body


def test_index_html_includes_fallback_markup(client: TestClient) -> None:
    body = client.get("/").text
    assert 'id="mwide-fallback"' in body
    assert "MWIDE is not reachable" in body
    assert "PORT=10602" in body
    assert "docs/mwide-port-migration.md" in body


def test_index_html_has_reload_button_and_external_link(client: TestClient) -> None:
    body = client.get("/").text
    assert 'id="mwide-reload-btn"' in body
    assert 'href="http://localhost:10602/"' in body


def test_port_migration_diff_doc_exists() -> None:
    """The doc that walks Douglas through the cross-project edits must ship."""
    diff = ROOT / "docs" / "mwide-port-migration.md"
    assert diff.is_file(), f"missing {diff}"
    content = diff.read_text()
    assert "10001" in content
    assert "10602" in content
    assert "{{PORT}}" in content
    assert "port-registry.json" in content
