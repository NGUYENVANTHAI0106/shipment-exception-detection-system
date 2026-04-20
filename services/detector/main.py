from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Literal

try:
    import redis
except ModuleNotFoundError:  # pragma: no cover
    redis = None

try:
    from fastapi import FastAPI
except ModuleNotFoundError:  # pragma: no cover
    class FastAPI:  # type: ignore[override]
        def __init__(self, *args, **kwargs) -> None:
            pass

        def post(self, *_args, **_kwargs):
            def decorator(func):
                return func

            return decorator
from pydantic import BaseModel, ConfigDict, Field

from services.detector.core import evaluate_rule

Severity = Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
ExceptionType = Literal["delay", "failed_delivery", "address_issue", "stuck"]

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
REDIS_TTL_SECONDS = int(os.getenv("DETECTOR_DEDUP_TTL_SECONDS", "3600"))
class InMemoryRedis:
    def __init__(self) -> None:
        self._store: dict[str, str] = {}

    def exists(self, key: str) -> bool:
        return key in self._store

    def setex(self, key: str, _ttl: int, value: str) -> None:
        self._store[key] = value


redis_client = (
    redis.from_url(REDIS_URL, decode_responses=True) if redis is not None else InMemoryRedis()
)

app = FastAPI(title="detector-service", version="0.1.0")


class ShipmentPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    tracking_number: str
    carrier: str
    origin: str
    destination: str
    expected_delivery: datetime
    actual_delivery: datetime | None = None
    status: str
    failed_attempts: int = 0
    last_updated: datetime
    created_at: datetime | None = None


class DetectRequest(BaseModel):
    shipment: ShipmentPayload
@app.post("/detect")
def detect_exception(payload: DetectRequest) -> dict:
    shipment = payload.shipment
    cache_key = f"processed:{shipment.id}"

    if redis_client.exists(cache_key):
        return {
            "shipment_id": shipment.id,
            "is_exception": False,
            "skipped": True,
            "skip_reason": "already_processed_in_cache",
        }

    result = evaluate_rule(shipment.model_dump())
    redis_client.setex(cache_key, REDIS_TTL_SECONDS, "1")
    return result
