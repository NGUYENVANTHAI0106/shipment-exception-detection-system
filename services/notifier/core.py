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


def _format_suggestion(payload: dict) -> str:
    raw = (payload.get("ai_suggestion") or "").strip()
    return raw if raw else "Chưa có gợi ý"


def build_ops_message(payload: dict) -> str:
    eid = str(payload.get("exception_id", "unknown"))
    tracking = (payload.get("tracking_number") or "").strip()
    exc_type = str(payload.get("exception_type", "unknown"))
    type_line = "" if exc_type in ("", "unknown", "manual_test") else f"- Loại: `{exc_type}`\n"
    tracking_line = f"- Mã vận đơn: `{tracking}`\n" if tracking else ""
    return (
        "🚚 *Cảnh báo đơn có vấn đề*\n"
        f"{tracking_line}"
        f"- Mã case: `{eid}`\n"
        f"- Mức độ: *{payload.get('severity', 'UNKNOWN')}*\n"
        f"{type_line}"
        f"- Hãng: `{payload.get('carrier', 'unknown')}`\n"
        f"- Lý do: {payload.get('reason', 'n/a')}\n"
        f"- Gợi ý xử lý: {_format_suggestion(payload)}"
    )


def build_manager_escalation_message(payload: dict) -> str:
    eid = str(payload.get("exception_id", "unknown"))
    tracking = (payload.get("tracking_number") or "").strip()
    tracking_line = f"- Mã vận đơn: `{tracking}`\n" if tracking else ""
    return (
        "🚨 *Cần ưu tiên xử lý*\n"
        f"{tracking_line}"
        f"- Mã case: `{eid}`\n"
        f"- Mức độ: *{payload.get('severity', 'UNKNOWN')}*\n"
        f"- Trễ giao (giờ): `{payload.get('overdue_hours', 0)}`\n"
        f"- Lý do: {payload.get('reason', 'n/a')}"
    )
