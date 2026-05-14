"""Application configuration via pydantic-settings.

Supports env vars (MCP_ prefix), .env files, and CLI defaults.
"""

from __future__ import annotations

import sys
from pathlib import Path

from pydantic_settings import BaseSettings


class MCPSettings(BaseSettings):
    """Configuration for the Project Tracker MCP server."""

    # Paths
    projects_dir: Path = Path.home() / "Github" / "TheAIgentsCompany" / "agents" / "projects"
    skills_dir: Path = Path.home() / ".hermes" / "skills"

    # Transport
    transport: str = "stdio"  # stdio | sse

    # SSE server
    host: str = "0.0.0.0"
    port: int = 8000

    # Behaviour
    verbose: bool = False

    model_config = {"env_prefix": "MCP_"}  # MCP_PROJECTS_DIR, MCP_TRANSPORT, etc.

    def check_dirs(self) -> None:
        """Log warnings for missing directories."""
        import logging

        logger = logging.getLogger("theaigents_tracker")
        if not self.projects_dir.exists():
            logger.warning("Projects directory not found: %s", self.projects_dir)
        if not self.skills_dir.exists():
            logger.warning("Skills directory not found: %s", self.skills_dir)

    def __repr__(self) -> str:
        return (
            f"MCPSettings("
            f"projects_dir={self.projects_dir}, "
            f"skills_dir={self.skills_dir}, "
            f"transport={self.transport}, "
            f"verbose={self.verbose})"
        )


def setup_logging(verbose: bool = False) -> None:
    """Configure structured logging to stderr.

    stdout is reserved for JSON-RPC traffic — never log there.
    """
    import logging

    level = logging.DEBUG if verbose else logging.INFO
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%H:%M:%S",
        )
    )

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(handler)

    # Keep third-party loggers quiet
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("mcp").setLevel(logging.WARNING)
