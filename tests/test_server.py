"""Tests for the MCP server — interactive stdio protocol testing.

Uses subprocess with stdin/stdout pipes to simulate a real MCP client,
sending one request at a time and reading responses.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest


@pytest.fixture
def server_process(test_projects_dir: Path):
    """Start an MCP server subprocess with stdio transport.

    Yields a (stdin_write, stdout_read) tuple for interactive communication.
    """
    proc = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "theaigents_tracker",
            "--projects-dir",
            str(test_projects_dir),
            "--skills-dir",
            str(test_projects_dir.parent / "skills"),
        ],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,  # line-buffered
    )
    yield proc
    # Cleanup
    proc.stdin.close()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()


def _send(
    proc: subprocess.Popen,
    method: str,
    params: dict | None = None,
    req_id: int | None = 1,
) -> dict:
    """Send a JSON-RPC request and read the response."""
    msg: dict = {"jsonrpc": "2.0", "method": method}
    if req_id is not None:
        msg["id"] = req_id
    if params is not None:
        msg["params"] = params
    proc.stdin.write(json.dumps(msg) + "\n")
    proc.stdin.flush()

    # Read response line
    line = proc.stdout.readline().strip()
    if not line:
        raise RuntimeError(f"No response for {method} (id={req_id})")
    return json.loads(line)


def _send_notification(proc: subprocess.Popen, method: str, params: dict | None = None) -> None:
    """Send a JSON-RPC notification (no response expected)."""
    msg: dict = {"jsonrpc": "2.0", "method": method}
    if params is not None:
        msg["params"] = params
    proc.stdin.write(json.dumps(msg) + "\n")
    proc.stdin.flush()


class TestMCPInteractive:
    """Interactive MCP tests — one request at a time."""

    @pytest.fixture(autouse=True)
    def setup(self, server_process):
        """Send initialize and notifications/initialized."""
        self.proc = server_process
        resp = _send(self.proc, "initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "test", "version": "1.0"},
        }, req_id=1)
        assert resp["id"] == 1
        assert resp["result"]["protocolVersion"] == "2024-11-05"
        _send_notification(self.proc, "notifications/initialized")

    def test_tools_list(self):
        """tools/list returns all tools."""
        resp = _send(self.proc, "tools/list", req_id=10)
        tools = resp["result"]["tools"]
        tool_names = [t["name"] for t in tools]
        assert "list_projects_tool" in tool_names
        assert "get_project_tool" in tool_names
        assert "list_skills_tool" in tool_names
        assert "get_project_count_tool" in tool_names
        assert "search_projects_tool" in tool_names

    def test_list_projects(self):
        """list_projects returns projects."""
        resp = _send(self.proc, "tools/call", {
            "name": "list_projects_tool",
            "arguments": {},
        }, req_id=20)
        text = resp["result"]["content"][0]["text"]
        assert "Company Website" in text
        assert "Project Tracker MCP" in text

    def test_get_project(self):
        """get_project returns a single project."""
        resp = _send(self.proc, "tools/call", {
            "name": "get_project_tool",
            "arguments": {"project_id": "website"},
        }, req_id=30)
        text = resp["result"]["content"][0]["text"]
        assert "Company Website" in text
        assert "active" in text

    def test_get_project_not_found(self):
        """get_project returns helpful message for missing project."""
        resp = _send(self.proc, "tools/call", {
            "name": "get_project_tool",
            "arguments": {"project_id": "nonexistent"},
        }, req_id=40)
        text = resp["result"]["content"][0]["text"]
        assert "not found" in text.lower()

    def test_search_projects(self):
        """search_projects finds matching projects."""
        resp = _send(self.proc, "tools/call", {
            "name": "search_projects_tool",
            "arguments": {"query": "landing"},
        }, req_id=50)
        text = resp["result"]["content"][0]["text"]
        assert "landing" in text.lower()

    def test_project_count(self):
        """get_project_count returns aggregated counts."""
        resp = _send(self.proc, "tools/call", {
            "name": "get_project_count_tool",
            "arguments": {},
        }, req_id=60)
        text = resp["result"]["content"][0]["text"]
        assert "Total" in text or "2" in text

    def test_resource_project(self):
        """project://{id} resource returns project data."""
        resp = _send(self.proc, "resources/read", {
            "uri": "project://website",
        }, req_id=70)
        text = resp["result"]["contents"][0]["text"]
        assert "Company Website" in text

    def test_resource_projects_list(self):
        """projects://list returns JSON."""
        resp = _send(self.proc, "resources/read", {
            "uri": "projects://list",
        }, req_id=80)
        text = resp["result"]["contents"][0]["text"]
        data = json.loads(text)
        assert isinstance(data, list)
        assert len(data) >= 2

    def test_resource_projects_counts(self):
        """projects://counts returns JSON counts."""
        resp = _send(self.proc, "resources/read", {
            "uri": "projects://counts",
        }, req_id=90)
        text = resp["result"]["contents"][0]["text"]
        counts = json.loads(text)
        assert "total" in counts
        assert counts["total"] >= 2
