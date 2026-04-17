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


_DELIVERED_LIKE = {"delivered", "returned", "cancelled"}
_ACTIVE_EXCEPTION_STATUSES = {"open", "investigating", "assigned"}


def _norm_str(v: object) -> str:
    return str(v or "").strip()


def _lower(v: object) -> str:
    return _norm_str(v).lower()


def _haystack(shipment: Shipment) -> str:
    # Heuristic: include status + raw_data textual form for keyword scans.
    parts = [shipment.status or ""]
    if shipment.raw_data:
        parts.append(str(shipment.raw_data))
    return " ".join(parts).lower()


def _compute_delay_hours(now: datetime, eta: datetime) -> float:
    return (now - eta).total_seconds() / 3600.0


def _delay_severity(delay_hours: float) -> str | None:
    # Spec (plan.md):
    # - 1-24h -> medium
    # - 24-72h -> high
    # - >72h -> critical
    if delay_hours <= 1:
        return None
    if delay_hours <= 24:
        return "medium"
    if delay_hours <= 72:
        return "high"
    return "critical"


def _stale_days(now: datetime, shipment: Shipment) -> int | None:
    # Prefer last_event_at from raw_data if present; fallback to updated_at.
    # Accept either ISO string or epoch seconds in raw_data["last_event_at"].
    if shipment.raw_data and isinstance(shipment.raw_data, dict):
        last = shipment.raw_data.get("last_event_at") or shipment.raw_data.get("lastEventAt")
        try:
            if isinstance(last, (int, float)):
                dt = datetime.fromtimestamp(float(last), tz=timezone.utc)
                return int((now - dt).days)
            if isinstance(last, str) and last.strip():
                dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return int((now - dt).days)
        except Exception:
            pass

    if shipment.updated_at:
        return int((now - shipment.updated_at).days)
    return None


def _lost_severity(service_level: str, stale_days: int) -> str | None:
    # Spec (plan.md):
    # - Express: >3 ngày -> high
    # - Standard: >7 ngày -> high
    # - >14 ngày -> critical
    if stale_days <= 0:
        return None
    if stale_days > 14:
        return "critical"

    sl = service_level.lower()
    if sl in {"express", "priority"}:
        return "high" if stale_days > 3 else None
    # default to standard thresholds
    return "high" if stale_days > 7 else None


def _get_service_level(shipment: Shipment) -> str:
    if shipment.raw_data and isinstance(shipment.raw_data, dict):
        v = shipment.raw_data.get("service_level") or shipment.raw_data.get("serviceLevel") or ""
        return _norm_str(v) or "standard"
    return "standard"


def _match_conditions(
    *,
    shipment: Shipment,
    now: datetime,
    conditions: dict,
    condition_operator: str,
) -> tuple[bool, dict]:
    """
    Supported operators (plan.md):
    - status_in, carrier_in, destination_in, service_level_in
    - delay_hours_gt
    - stale_days_gt
    """
    op = (condition_operator or "AND").upper()
    checks: list[tuple[str, bool]] = []

    status_in = conditions.get("status_in") or conditions.get("statusIn")
    if status_in is not None:
        allowed = {str(x).lower() for x in (status_in or [])}
        checks.append(("status_in", shipment.status.lower() in allowed))

    carrier_in = conditions.get("carrier_in") or conditions.get("carrierIn")
    if carrier_in is not None:
        allowed = {str(x).lower() for x in (carrier_in or [])}
        checks.append(("carrier_in", shipment.carrier.lower() in allowed))

    destination_in = conditions.get("destination_in") or conditions.get("destinationIn")
    if destination_in is not None:
        allowed = {str(x).lower() for x in (destination_in or [])}
        checks.append(("destination_in", _lower(shipment.destination) in allowed))

    service_level_in = conditions.get("service_level_in") or conditions.get("serviceLevelIn")
    if service_level_in is not None:
        allowed = {str(x).lower() for x in (service_level_in or [])}
        checks.append(("service_level_in", _get_service_level(shipment).lower() in allowed))

    delay_hours_gt = conditions.get("delay_hours_gt") or conditions.get("delayHoursGt")
    if delay_hours_gt is not None:
        ok = False
        if shipment.estimated_delivery:
            ok = _compute_delay_hours(now, shipment.estimated_delivery) > float(delay_hours_gt)
        checks.append(("delay_hours_gt", ok))

    stale_days_gt = conditions.get("stale_days_gt") or conditions.get("staleDaysGt")
    if stale_days_gt is not None:
        sd = _stale_days(now, shipment)
        ok = sd is not None and sd > int(stale_days_gt)
        checks.append(("stale_days_gt", ok))

    if not checks:
        return False, {"reason": "no_conditions"}

    if op == "OR":
        matched = any(ok for _, ok in checks)
    else:
        matched = all(ok for _, ok in checks)
    return matched, {"checks": [{"key": k, "ok": ok} for k, ok in checks], "operator": op}


def detect_for_shipment(db: Session, shipment: Shipment) -> list[DetectedException]:
    detected: list[DetectedException] = []
    now = _now()

    status_lc = shipment.status.lower()
    if status_lc in _DELIVERED_LIKE or shipment.actual_delivery is not None:
        return detected

    # v1: delay detection
    if shipment.estimated_delivery and shipment.estimated_delivery < now:
        dh = _compute_delay_hours(now, shipment.estimated_delivery)
        sev = _delay_severity(dh)
        if sev:
            detected.append(
                DetectedException(
                    type="delay",
                    severity=sev,
                    description=f"Trễ ETA ~{dh:.1f}h (ETA {shipment.estimated_delivery.isoformat()}).",
                )
            )

    # v1: lost detection (stale update)
    sd = _stale_days(now, shipment)
    if sd is not None:
        sev = _lost_severity(_get_service_level(shipment), sd)
        if sev:
            detected.append(
                DetectedException(
                    type="lost",
                    severity=sev,
                    description=f"Không có cập nhật {sd} ngày (service_level={_get_service_level(shipment)}).",
                )
            )

    # v1: keyword-based detections (status/raw_data)
    text = _haystack(shipment)
    if any(k in text for k in ["damage", "damaged", "broken", "leaking", "crushed"]):
        detected.append(DetectedException(type="damage", severity="high", description="Phát hiện dấu hiệu hư hỏng (damage keywords)."))
    if any(k in text for k in ["customs", "clearance", "held", "import delay", "inspection"]):
        detected.append(DetectedException(type="customs", severity="medium", description="Shipment có dấu hiệu bị giữ ở hải quan (customs keywords)."))
    if any(k in text for k in ["address incorrect", "bad address", "recipient unavailable", "address not found", "wrong address"]):
        detected.append(
            DetectedException(type="wrong_address", severity="medium", description="Có dấu hiệu sai/không tìm thấy địa chỉ (address keywords).")
        )

    # v1: rule-based detections
    rules = db.execute(select(DetectionRule).where(DetectionRule.is_active.is_(True))).scalars().all()
    for r in rules:
        cond = r.conditions or {}
        cond_op = _norm_str(cond.get("condition_operator") or cond.get("conditionOperator") or "AND")
        matched, meta = _match_conditions(shipment=shipment, now=now, conditions=cond, condition_operator=cond_op)
        if not matched:
            continue

        # Rule's `type` is mapped directly to exception type (custom/delay/lost/...)
        exc_type = r.type or "custom"
        detected.append(
            DetectedException(
                type=exc_type,
                severity=r.severity,
                description=f"Rule '{r.name}' matched. meta={meta}",
            )
        )

    return detected


def persist_detected(db: Session, shipment: Shipment, detected: list[DetectedException]) -> list[ExceptionRecord]:
    created: list[ExceptionRecord] = []

    existing = db.execute(select(ExceptionRecord).where(ExceptionRecord.shipment_id == shipment.id)).scalars().all()
    seen_types = {e.type for e in existing if (e.status or "").lower() in _ACTIVE_EXCEPTION_STATUSES}

    for d in detected:
        # Dedupe by (shipment_id, type) across existing + this run.
        if d.type in seen_types:
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
        seen_types.add(d.type)

    return created

