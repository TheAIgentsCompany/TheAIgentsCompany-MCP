"""Tests for the config module."""

from __future__ import annotations

from theaigents_tracker.config import MCPSettings


class TestMCPSettings:
    def test_defaults(self) -> None:
        """Default settings use sensible paths."""
        s = MCPSettings()
        assert s.transport == "stdio"
        assert s.host == "0.0.0.0"
        assert s.port == 8000
        assert s.verbose is False

    def test_repr(self) -> None:
        """Settings has a readable repr."""
        s = MCPSettings()
        r = repr(s)
        assert "MCPSettings(" in r
        assert "transport=stdio" in r
