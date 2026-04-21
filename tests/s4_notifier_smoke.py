from __future__ import annotations

from services.notifier.core import apply_sla_escalation, route_channels


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

    print("S4 notifier smoke tests passed: 4/4")


if __name__ == "__main__":
    run_smoke_tests()
