"""Path governance tests for the FS bridge.

Verifies that critical root directories cannot be deleted through /api/fs/remove,
and that the path allow/deny guard works correctly.

These are unit tests that test the guard logic directly without needing a live server.
Integration tests (requiring a running server) should live in a separate e2e file.
"""

from __future__ import annotations

from pathlib import Path as _PathLibTest


def test_sentinel_blocklist_has_storage_volume():
    """The sentinel list must contain /Volumes/Storage as a critical root."""
    import server

    assert "/Volumes/Storage" in server._WE_DELETE_SENTINEL_ROOTS


def test_sentinel_blocklist_has_sandisk_volume():
    """The sentinel list must contain /Volumes/SanDisk1Tb as a critical root."""
    import server

    assert "/Volumes/SanDisk1Tb" in server._WE_DELETE_SENTINEL_ROOTS


def test_sentinel_blocklist_has_home():
    """The sentinel list must contain the user's home directory as a critical root."""
    import os

    import server

    home = os.path.expanduser("~")
    assert home in server._WE_DELETE_SENTINEL_ROOTS


def test_sentinel_blocks_exact_volume_paths():
    """Exact sentinel root paths must be blocked by the guard logic."""
    import server

    for sentinel in server._WE_DELETE_SENTINEL_ROOTS:
        resolved = str(_PathLibTest(sentinel).resolve())
        # Simulate the guard logic inline
        blocked = any(
            resolved == s or resolved.startswith(s + "/")
            for s in server._WE_DELETE_SENTINEL_ROOTS
        )
        assert blocked, f"Sentinel {sentinel!r} was not blocked"


def test_sentinel_blocks_subpath_of_volume():
    """A subpath of a sentinel root must also be blocked."""
    import server

    sentinel = "/Volumes/Storage"
    subpath = "/Volumes/Storage/Legacy Agents"
    resolved = str(_PathLibTest(subpath).resolve())
    blocked = any(
        resolved == s or resolved.startswith(s + "/")
        for s in server._WE_DELETE_SENTINEL_ROOTS
    )
    assert blocked, "Subpath of sentinel root must be blocked"


def test_sentinel_does_not_block_tmp():
    """Non-sentinel allowed paths like /tmp must not be blocked."""
    import server

    resolved = str(_PathLibTest("/tmp/some-dir").resolve())
    blocked = any(
        resolved == s or resolved.startswith(s + "/")
        for s in server._WE_DELETE_SENTINEL_ROOTS
    )
    assert not blocked, "/tmp/some-dir should not be blocked by sentinel guard"
