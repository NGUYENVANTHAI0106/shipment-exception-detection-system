from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ExceptionResponse(BaseModel):
    id: int
    shipment_id: int
    type: str
    severity: str
    description: str
    detected_at: datetime
    resolved_at: datetime | None
    resolved_by: int | None
    status: str
    auto_detected: bool


class ExceptionUpdate(BaseModel):
    status: str | None = Field(default=None, pattern="^(open|investigating|resolved|dismissed)$")

