from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exception import ExceptionRecord
from app.models.rule import DetectionRule
from app.models.shipment import Shipment


@dataclass(frozen=True)
class DetectedException:
    type: str
    severity: str
    description: str


def _now() -> datetime:
    return datetime.now(timezone.utc)


def detect_for_shipment(db: Session, shipment: Shipment) -> list[DetectedException]:
    detected: list[DetectedException] = []
    now = _now()

    # v1: delay if past ETA and not delivered
    if shipment.estimated_delivery and shipment.actual_delivery is None:
        if shipment.estimated_delivery < now and shipment.status.lower() not in {"delivered"}:
            detected.append(
                DetectedException(
                    type="delay",
                    severity="high",
                    description=f"Shipment quá ETA ({shipment.estimated_delivery.isoformat()}) nhưng chưa delivered.",
                )
            )

    # v1: lost if no update and not delivered; relies on updated_at
    lost_days = 7
    if shipment.actual_delivery is None and shipment.status.lower() not in {"delivered"}:
        if shipment.updated_at and (now - shipment.updated_at).days >= lost_days:
            detected.append(
                DetectedException(
                    type="lost",
                    severity="critical",
                    description=f"Không có cập nhật ≥ {lost_days} ngày, nghi ngờ lost.",
                )
            )

    # basic custom rules (type=custom): conditions supports {"status_in": [...]} and/or {"carrier_in":[...]}
    rules = db.execute(select(DetectionRule).where(DetectionRule.is_active.is_(True))).scalars().all()
    for r in rules:
        if r.type not in {"custom"}:
            continue
        cond = r.conditions or {}
        status_in = set(map(str.lower, cond.get("status_in", []) or []))
        carrier_in = set(map(str.lower, cond.get("carrier_in", []) or []))

        if status_in and shipment.status.lower() not in status_in:
            continue
        if carrier_in and shipment.carrier.lower() not in carrier_in:
            continue

        detected.append(
            DetectedException(
                type="custom",
                severity=r.severity,
                description=f"Rule '{r.name}' matched.",
            )
        )

    return detected


def persist_detected(db: Session, shipment: Shipment, detected: list[DetectedException]) -> list[ExceptionRecord]:
    created: list[ExceptionRecord] = []

    existing = db.execute(select(ExceptionRecord).where(ExceptionRecord.shipment_id == shipment.id)).scalars().all()
    existing_keys = {(e.type, e.description) for e in existing if e.status in {"open", "investigating"}}

    for d in detected:
        key = (d.type, d.description)
        if key in existing_keys:
            continue
        rec = ExceptionRecord(
            shipment_id=shipment.id,
            type=d.type,
            severity=d.severity,
            description=d.description,
            status="open",
            auto_detected=True,
        )
        db.add(rec)
        created.append(rec)

    return created

