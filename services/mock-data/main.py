from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from uuid import uuid4

try:
    from fastapi import FastAPI, Query
except ModuleNotFoundError:  # pragma: no cover
    class FastAPI:  # type: ignore[override]
        def __init__(self, *args, **kwargs) -> None:
            pass

        def get(self, *_args, **_kwargs):
            def decorator(func):
                return func

            return decorator

    def Query(default=None, **_kwargs):  # type: ignore[misc]
        return default

app = FastAPI(title="mock-data-service", version="0.1.0")

CARRIERS = ["GHN", "GHTK", "ViettelPost", "J&T"]
LOCATIONS = [
    "Ha Noi",
    "Ho Chi Minh",
    "Da Nang",
    "Can Tho",
    "Hai Phong",
]

ACTIVE_STATUSES = ["in_transit", "failed", "stuck", "address_issue"]


def generate_tracking_number() -> str:
    return f"TRK-{random.choice(['GH', 'VT', 'JT', 'GK'])}{random.randint(1000, 9999)}{random.choice(['AB', 'CD', 'EF'])}"


def generate_shipment(force_exception: bool) -> dict:
    now = datetime.now(timezone.utc)
    created_at = now - timedelta(days=random.randint(1, 7))
    base_status = random.choice(ACTIVE_STATUSES if force_exception else ["in_transit"])
    failed_attempts = random.randint(0, 4) if base_status == "failed" else random.randint(0, 1)

    if base_status == "in_transit":
        overdue_hours = random.choice([6, 12, 20, 30, 54, 80]) if force_exception else random.choice([2, 4, 8, 16])
        expected_delivery = now - timedelta(hours=overdue_hours)
        last_updated = now - timedelta(hours=random.choice([1, 6, 12, 24]))
    elif base_status == "stuck":
        expected_delivery = now - timedelta(hours=random.choice([26, 40, 72]))
        last_updated = now - timedelta(hours=random.choice([52, 70, 110]))
    else:
        expected_delivery = now + timedelta(hours=random.randint(4, 48))
        last_updated = now - timedelta(hours=random.choice([2, 8, 20]))

    origin, destination = random.sample(LOCATIONS, 2)
    return {
        "id": str(uuid4()),
        "tracking_number": generate_tracking_number(),
        "carrier": random.choice(CARRIERS),
        "origin": origin,
        "destination": destination,
        "expected_delivery": expected_delivery.isoformat(),
        "actual_delivery": None,
        "status": base_status,
        "failed_attempts": failed_attempts,
        "last_updated": last_updated.isoformat(),
        "created_at": created_at.isoformat(),
    }


@app.get("/shipments")
def get_shipments(
    count: int = Query(default=30, ge=1, le=200),
    exception_ratio: float = Query(default=0.4, ge=0, le=1),
) -> dict:
    results: list[dict] = []
    for _ in range(count):
        force_exception = random.random() <= exception_ratio
        results.append(generate_shipment(force_exception=force_exception))
    return {"count": count, "items": results}
