from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ShipmentBase(BaseModel):
    tracking_number: str = Field(min_length=3, max_length=128)
    carrier: str = Field(min_length=2, max_length=64)
    origin: str | None = None
    destination: str | None = None
    status: str = "in_transit"
    current_location: str | None = None
    estimated_delivery: datetime | None = None
    actual_delivery: datetime | None = None
    weight: float | None = None
    raw_data: dict | None = None


class ShipmentCreate(ShipmentBase):
    pass


class ShipmentUpdate(BaseModel):
    origin: str | None = None
    destination: str | None = None
    status: str | None = None
    current_location: str | None = None
    estimated_delivery: datetime | None = None
    actual_delivery: datetime | None = None
    weight: float | None = None
    raw_data: dict | None = None


class ShipmentResponse(ShipmentBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

