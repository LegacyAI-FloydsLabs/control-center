"""Tests for Agent Execution backend API (BETA-05 functional)."""

import pytest

from fastapi.testclient import TestClient

from server import app


@pytest.fixture
def client():
    return TestClient(app)


class TestDoEndpoint:
    def test_list_empty(self, client):
        resp = client.post("/api/do", json={"action": "list"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert isinstance(data["sessions"], list)
        assert "hint" in data
        assert "actions" in data

    def test_invalid_action(self, client):
        resp = client.post("/api/do", json={"action": "bogus"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is False
        assert "invalid action" in data["error"]

    def test_create_session(self, client):
        resp = client.post(
            "/api/do",
            json={
                "action": "create",
                "session": "unit-test",
                "command": "/bin/bash",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert "id" in data
        assert data["status"] == "stopped"
        # Cleanup
        client.post("/api/do", json={"action": "delete", "session": "unit-test"})

    def test_session_lifecycle(self, client):
        """create -> start -> run -> read -> stop -> delete"""
        # Create
        resp = client.post(
            "/api/do",
            json={
                "action": "create",
                "session": "lifecycle-test",
                "command": "/bin/bash",
            },
        )
        assert resp.json()["ok"] is True

        # Start
        resp = client.post(
            "/api/do", json={"action": "start", "session": "lifecycle-test"}
        )
        assert resp.json()["ok"] is True
        assert resp.json()["status"] == "ready"

        # Run
        resp = client.post(
            "/api/do",
            json={"action": "run", "session": "lifecycle-test", "input": "echo hello"},
        )
        assert resp.json()["ok"] is True
        assert "$ echo hello" in resp.json()["output"]

        # Read
        resp = client.post(
            "/api/do", json={"action": "read", "session": "lifecycle-test"}
        )
        assert resp.json()["ok"] is True
        assert resp.json()["status"] == "ready"

        # Stop
        resp = client.post(
            "/api/do", json={"action": "stop", "session": "lifecycle-test"}
        )
        assert resp.json()["ok"] is True
        assert resp.json()["status"] == "stopped"

        # Delete
        resp = client.post(
            "/api/do", json={"action": "delete", "session": "lifecycle-test"}
        )
        assert resp.json()["ok"] is True

        # Verify gone
        resp = client.post("/api/do", json={"action": "list"})
        names = [s["name"] for s in resp.json()["sessions"]]
        assert "lifecycle-test" not in names

    def test_session_not_found(self, client):
        resp = client.post("/api/do", json={"action": "read", "session": "nonexistent"})
        assert resp.status_code == 200
        assert resp.json()["ok"] is False
        assert "not found" in resp.json()["error"]

    def test_run_without_input(self, client):
        resp = client.post(
            "/api/do",
            json={"action": "create", "session": "run-test", "command": "/bin/bash"},
        )
        resp = client.post("/api/do", json={"action": "run", "session": "run-test"})
        assert resp.json()["ok"] is False
        assert "input required" in resp.json()["error"]
        client.post("/api/do", json={"action": "delete", "session": "run-test"})

    def test_cancel_session(self, client):
        client.post(
            "/api/do",
            json={"action": "create", "session": "cancel-test", "command": "/bin/bash"},
        )
        client.post("/api/do", json={"action": "start", "session": "cancel-test"})
        resp = client.post(
            "/api/do", json={"action": "cancel", "session": "cancel-test"}
        )
        assert resp.json()["ok"] is True
        client.post("/api/do", json={"action": "delete", "session": "cancel-test"})

    def test_bridge_action(self, client):
        resp = client.post("/api/do", json={"action": "bridge"})
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        assert "bridge_status" in resp.json()

    def test_note_action(self, client):
        client.post(
            "/api/do",
            json={"action": "create", "session": "note-test", "command": "/bin/bash"},
        )
        # Set note
        resp = client.post(
            "/api/do",
            json={"action": "note", "session": "note-test", "input": "test note"},
        )
        assert resp.json()["ok"] is True
        # Read note
        resp = client.post("/api/do", json={"action": "note", "session": "note-test"})
        assert resp.json()["scratchpad"] == "test note"
        client.post("/api/do", json={"action": "delete", "session": "note-test"})

    def test_search_action(self, client):
        resp = client.post("/api/do", json={"action": "search", "input": "test"})
        assert resp.json()["ok"] is True

    def test_history_action(self, client):
        client.post(
            "/api/do",
            json={"action": "create", "session": "hist-test", "command": "/bin/bash"},
        )
        resp = client.post(
            "/api/do", json={"action": "history", "session": "hist-test"}
        )
        assert resp.json()["ok"] is True
        client.post("/api/do", json={"action": "delete", "session": "hist-test"})

    def test_broadcast_action(self, client):
        resp = client.post("/api/do", json={"action": "broadcast", "input": "test"})
        assert resp.json()["ok"] is True

    def test_create_without_session_name(self, client):
        resp = client.post("/api/do", json={"action": "create", "command": "/bin/bash"})
        assert resp.json()["ok"] is False
        assert "session" in resp.json()["error"].lower()
