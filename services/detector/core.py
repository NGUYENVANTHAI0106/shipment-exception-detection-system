from __future__ import annotations

from datetime import datetime, timezone


def hours_between(now_utc: datetime, reference: datetime) -> float:
    return (now_utc - reference.astimezone(timezone.utc)).total_seconds() / 3600


def evaluate_rule(shipment: dict, now: datetime | None = None) -> dict:
    now_utc = now or datetime.now(timezone.utc)
    status = shipment["status"]
    failed_attempts = int(shipment.get("failed_attempts", 0))

    if status in {"delivered", "returned"}:
        return {"shipment_id": shipment["id"], "is_exception": False, "skipped": False}

    if status == "failed" or failed_attempts >= 2:
        severity = "CRITICAL" if failed_attempts >= 3 else "HIGH"
        return {
            "shipment_id": shipment["id"],
            "is_exception": True,
            "exception_type": "failed_delivery",
            "reason": f"Delivery failed after {failed_attempts} attempt(s)",
            "severity_hint": severity,
            "overdue_hours": 0.0,
            "skipped": False,
        }

    hours_since_last_update = hours_between(now_utc, shipment["last_updated"])
    if hours_since_last_update > 48:
        severity = "CRITICAL" if hours_since_last_update > 96 else "HIGH"
        return {
            "shipment_id": shipment["id"],
            "is_exception": True,
            "exception_type": "stuck",
            "reason": f"No status update for {hours_since_last_update:.0f} hours",
            "severity_hint": severity,
            "overdue_hours": 0.0,
            "skipped": False,
        }

    overdue_hours = hours_between(now_utc, shipment["expected_delivery"])
    if status == "in_transit" and shipment.get("actual_delivery") is None and overdue_hours > 24:
        if overdue_hours > 72:
            severity = "CRITICAL"
        elif overdue_hours > 48:
            severity = "HIGH"
        else:
            severity = "MEDIUM"
        return {
            "shipment_id": shipment["id"],
            "is_exception": True,
            "exception_type": "delay",
            "reason": f"Overdue by {overdue_hours:.1f} hours — expected {shipment['expected_delivery']:%Y-%m-%d %H:%M}",
            "severity_hint": severity,
            "overdue_hours": round(overdue_hours, 2),
            "skipped": False,
        }

    if status == "address_issue":
        return {
            "shipment_id": shipment["id"],
            "is_exception": True,
            "exception_type": "address_issue",
            "reason": f"Carrier cannot verify delivery address for {shipment['destination']}",
            "severity_hint": "HIGH",
            "overdue_hours": 0.0,
            "skipped": False,
        }

    return {"shipment_id": shipment["id"], "is_exception": False, "skipped": False}
