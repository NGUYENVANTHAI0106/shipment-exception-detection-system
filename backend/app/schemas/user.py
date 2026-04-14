from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class AdminUserResponse(BaseModel):
    id: int
    email: EmailStr
    role: str
    company_name: str | None
    created_at: datetime


class AdminUserUpdate(BaseModel):
    role: str | None = Field(default=None, description="client | admin")
    company_name: str | None = Field(default=None, max_length=255)

