from __future__ import annotations

from services.notifier.core import apply_sla_escalation, route_channels
from services.notifier.main import NotifyRequest, notify


def run_smoke_tests() -> None:
    payload = {"severity": "HIGH", "overdue_hours": 80}
    escalated = apply_sla_escalation(payload)
    assert escalated["severity"] == "CRITICAL"
    assert escalated["sla_escalation_applied"] is True
    assert escalated["escalate_to_manager"] is True

    high_non_escalated = route_channels("HIGH", 24)
    assert high_non_escalated.channels == ["telegram_ops", "email"]
    assert high_non_escalated.is_escalated is False

    medium = route_channels("MEDIUM", 10)
    assert medium.channels == ["email"]
    assert medium.is_escalated is False

    low = route_channels("LOW", 0)
    assert low.channels == []
    assert low.is_escalated is False

    # Review fix: when there are required channels but delivery fails, API returns success=false.
    failed_notify = notify(
        NotifyRequest(
            exception_id="00000000-0000-0000-0000-000000000100",
            severity="HIGH",
            exception_type="delay",
            overdue_hours=10,
            reason="test",
            ai_suggestion="test",
            carrier="GHN",
            is_already_notified=False,
        )
    )
    assert failed_notify["success"] is False
    assert failed_notify["skipped_reason"] == "notification_delivery_failed"

    print("S4 notifier smoke tests passed: 5/5")


if __name__ == "__main__":
    run_smoke_tests()
