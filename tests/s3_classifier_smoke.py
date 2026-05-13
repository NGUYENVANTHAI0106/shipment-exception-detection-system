from __future__ import annotations

from services.classifier.core import classify_by_rules


def base_exception_data() -> dict:
    return {
        "exception_type": "delay",
        "reason": "Trễ hạn giao 36.5 giờ — dự kiến 2026-04-20 08:00",
        "severity_hint": "HIGH",
        "overdue_hours": 36.5,
        "carrier": "GHN",
        "destination": "Ha Noi",
        "failed_attempts": 1,
    }


def run_smoke_tests() -> None:
    result = classify_by_rules(base_exception_data())
    assert result["fallback_used"] is False
    assert result["severity"] == "HIGH"
    assert result["model_used"] == "rule_engine"
    assert result["exception_type"] == "delay"
    assert isinstance(result["suggested_action"], str) and result["suggested_action"]

    escalated = classify_by_rules({**base_exception_data(), "severity_hint": "CRITICAL"})
    assert escalated["severity"] == "CRITICAL"
    assert escalated["escalate_to_manager"] is True

    high_attempts = classify_by_rules({**base_exception_data(), "failed_attempts": 3})
    assert high_attempts["escalate_to_manager"] is True

    print("S3 classifier smoke tests passed: 3/3")


if __name__ == "__main__":
    run_smoke_tests()
