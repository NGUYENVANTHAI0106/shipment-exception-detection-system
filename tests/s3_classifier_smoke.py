from __future__ import annotations

import json

from services.classifier.core import classify_with_fallback


def base_exception_data() -> dict:
    return {
        "exception_type": "delay",
        "reason": "Overdue by 36.5 hours — expected 2026-04-20 08:00",
        "severity_hint": "HIGH",
        "overdue_hours": 36.5,
        "carrier": "GHN",
        "destination": "Ha Noi",
        "failed_attempts": 1,
    }


def base_history() -> dict:
    return {
        "previous_exception_count": 2,
        "last_exception_type": "stuck",
        "shipment_age_days": 3,
    }


def fake_claude_success(_exception_data: dict, _history: dict) -> str:
    return json.dumps(
        {
            "severity": "CRITICAL",
            "exception_type": "delay",
            "suggested_action": "Call GHN priority desk and confirm ETA in 1 hour.",
            "escalate_to_manager": True,
            "confidence": 0.91,
        }
    )


def fake_claude_invalid_json(_exception_data: dict, _history: dict) -> str:
    return "{invalid_json"


def run_smoke_tests() -> None:
    success = classify_with_fallback(
        exception_data=base_exception_data(),
        history=base_history(),
        call_claude_api=fake_claude_success,
        model_name="claude-haiku-4-5-20251001",
    )
    assert success["fallback_used"] is False
    assert success["severity"] == "CRITICAL"
    assert success["model_used"] == "claude-haiku-4-5-20251001"

    fallback = classify_with_fallback(
        exception_data=base_exception_data(),
        history=base_history(),
        call_claude_api=fake_claude_invalid_json,
        model_name="claude-haiku-4-5-20251001",
    )
    assert fallback["fallback_used"] is True
    assert fallback["severity"] == "HIGH"
    assert fallback["model_used"] == "rule_based_fallback"
    assert isinstance(fallback["fallback_reason"], str)

    print("S3 classifier smoke tests passed: 2/2")


if __name__ == "__main__":
    run_smoke_tests()
