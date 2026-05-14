"""Tests for the MCP server via stdio transport."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest


@pytest.fixture
def server_process(test_projects_dir: Path):
    """Start MCP server as subprocess with interactive stdio."""
    # Create a skills dir alongside projects dir
    skills_dir = test_projects_dir.parent / "skills"
    skills_dir.mkdir(parents=True, exist_ok=True)
    skill_dir = skills_dir / "theaigents-dev"
    skill_dir.mkdir(exist_ok=True)
    (skill_dir / "SKILL.md").write_text(
        """\
---
name: theaigents-dev
description: Engineering Lead — TDD, implementation, code structure
---
# Dev Skill
"""
    )

    proc = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "theaigentscompany_mcp",
            "--projects-dir",
            str(test_projects_dir),
            "--skills-dir",
            str(skills_dir),
        ],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )
    yield proc
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
    line = proc.stdout.readline().strip()
    assert line, f"No response for {method} (id={req_id})"
    return json.loads(line)


def _notify(proc: subprocess.Popen, method: str) -> None:
    """Send a JSON-RPC notification (no response)."""
    msg = {"jsonrpc": "2.0", "method": method}
    proc.stdin.write(json.dumps(msg) + "\n")
    proc.stdin.flush()


class TestMCP:
    """Interactive MCP tests — one request at a time."""

    @pytest.fixture(autouse=True)
    def setup(self, server_process):
        """Initialize the session."""
        self.proc = server_process
        resp = _send(
            self.proc,
            "initialize",
            {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "test", "version": "1.0"},
            },
            req_id=1,
        )
        assert resp["id"] == 1
        assert resp["result"]["protocolVersion"] == "2024-11-05"
        _notify(self.proc, "notifications/initialized")

    def test_tools_list(self):
        """tools/list returns exactly 3 tools."""
        resp = _send(self.proc, "tools/list", req_id=10)
        tools = resp["result"]["tools"]
        names = [t["name"] for t in tools]
        assert "list_projects_tool" in names
        assert "get_project_tool" in names
        assert "list_skills_tool" in names
        assert len(names) == 3

    def test_list_projects(self):
        """list_projects returns projects with repo links."""
        resp = _send(self.proc, "tools/call", {
            "name": "list_projects_tool",
            "arguments": {},
        }, req_id=20)
        text = resp["result"]["content"][0]["text"]
        assert "Company Website" in text
        assert "github.com" in text
        assert "2 Project(s)" in text

    def test_get_project(self):
        """get_project returns project detail + link."""
        resp = _send(self.proc, "tools/call", {
            "name": "get_project_tool",
            "arguments": {"project_id": "website"},
        }, req_id=30)
        text = resp["result"]["content"][0]["text"]
        assert "Company Website" in text
        assert "github.com" in text  # Has repo link
        assert "active" in text

    def test_get_project_not_found(self):
        """get_project returns helpful message."""
        resp = _send(self.proc, "tools/call", {
            "name": "get_project_tool",
            "arguments": {"project_id": "nonexistent"},
        }, req_id=40)
        text = resp["result"]["content"][0]["text"]
        assert "not found" in text.lower()

    def test_list_skills(self):
        """list_skills returns skills with descriptions."""
        resp = _send(self.proc, "tools/call", {
            "name": "list_skills_tool",
            "arguments": {},
        }, req_id=50)
        text = resp["result"]["content"][0]["text"]
        # The test skills dir has 1 skill
        assert "Skills" in text
