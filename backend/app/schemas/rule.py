from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class RuleCreate(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    type: str = Field(min_length=2, max_length=64)
    conditions: dict = Field(default_factory=dict)
    severity: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    is_active: bool = True


class RuleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=3, max_length=255)
    conditions: dict | None = None
    severity: str | None = Field(default=None, pattern="^(low|medium|high|critical)$")
    is_active: bool | None = None


class RuleResponse(BaseModel):
    id: int
    name: str
    type: str
    conditions: dict
    severity: str
    is_active: bool
    created_by: int | None
    created_at: datetime

