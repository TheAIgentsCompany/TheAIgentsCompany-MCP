"""Pydantic models for project and skill data.

Typed, validated data structures replacing raw dicts.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field


class ProjectModel(BaseModel):
    """A single project tracker with its lifecycle metadata."""

    id: str
    name: str
    status: str = "unknown"
    goal: str = ""
    repo: str = ""
    private: bool = True
    key_decisions: list[str] = Field(default_factory=list)
    architecture_notes: str = ""
    tasks: list[str] = Field(default_factory=list)
    body_preview: str = ""
    file_path: Path | None = None

    @property
    def is_active(self) -> bool:
        return self.status.lower() == "active"


class SkillModel(BaseModel):
    """A single Hermes skill with metadata."""

    id: str
    name: str
    description: str = ""
    path: Path | None = None


class ProjectCounts(BaseModel):
    """Aggregated project counts by status."""

    total: int = 0
    by_status: dict[str, int] = Field(default_factory=dict)

    @classmethod
    def from_project_list(cls, projects: list[ProjectModel]) -> ProjectCounts:
        counts: dict[str, int] = {}
        for p in projects:
            counts[p.status] = counts.get(p.status, 0) + 1
        return cls(total=len(projects), by_status=counts)


class ToolDefinition(BaseModel):
    """Schema for an MCP tool (used in documentation)."""

    name: str
    description: str
    read_only: bool = True
    parameters: list[dict[str, Any]] = Field(default_factory=list)
