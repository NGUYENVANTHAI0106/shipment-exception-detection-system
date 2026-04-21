from __future__ import annotations

from dataclasses import dataclass


@dataclass
class NotifyDecision:
    channels: list[str]
    is_escalated: bool


def apply_sla_escalation(payload: dict) -> dict:
    next_payload = dict(payload)
    severity = next_payload.get("severity")
    overdue = float(next_payload.get("overdue_hours", 0))
    if severity == "HIGH" and overdue > 72:
        next_payload["severity"] = "CRITICAL"
        next_payload["escalate_to_manager"] = True
        next_payload["sla_escalation_applied"] = True
    if severity == "MEDIUM" and overdue > 48:
        next_payload["severity"] = "HIGH"
        next_payload["sla_escalation_applied"] = True
    return next_payload


def route_channels(severity: str, overdue_hours: float) -> NotifyDecision:
    if severity == "CRITICAL":
        return NotifyDecision(
            channels=["telegram_ops", "telegram_manager", "email"],
            is_escalated=True,
        )
    if severity == "HIGH":
        if overdue_hours > 48:
            return NotifyDecision(
                channels=["telegram_ops", "telegram_manager", "email"],
                is_escalated=True,
            )
        return NotifyDecision(channels=["telegram_ops", "email"], is_escalated=False)
    if severity == "MEDIUM":
        return NotifyDecision(channels=["email"], is_escalated=False)
    if severity == "LOW":
        return NotifyDecision(channels=[], is_escalated=False)
    raise ValueError("unsupported_severity")


def build_ops_message(payload: dict) -> str:
    return (
        "🚚 *Shipment Exception Alert*\n"
        f"- Exception ID: `{payload.get('exception_id', 'unknown')}`\n"
        f"- Severity: *{payload.get('severity', 'UNKNOWN')}*\n"
        f"- Type: `{payload.get('exception_type', 'unknown')}`\n"
        f"- Carrier: `{payload.get('carrier', 'unknown')}`\n"
        f"- Reason: {payload.get('reason', 'n/a')}\n"
        f"- Suggested action: {payload.get('ai_suggestion', 'n/a')}"
    )


def build_manager_escalation_message(payload: dict) -> str:
    return (
        "🚨 *Escalation Required*\n"
        f"- Exception ID: `{payload.get('exception_id', 'unknown')}`\n"
        f"- Severity: *{payload.get('severity', 'UNKNOWN')}*\n"
        f"- Overdue hours: `{payload.get('overdue_hours', 0)}`\n"
        f"- Reason: {payload.get('reason', 'n/a')}"
    )
