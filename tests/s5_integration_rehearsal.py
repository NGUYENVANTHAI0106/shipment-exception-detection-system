from __future__ import annotations

import json
import urllib.error
import urllib.request

from services.classifier.core import classify_with_fallback
import services.notifier.main as notifier_main


def _http_post(url: str, payload: dict, timeout: int = 8) -> dict:
    req = urllib.request.Request(
        url,
        method="POST",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _base_exception() -> dict:
    return {
        "exception_type": "delay",
        "reason": "Shipment overdue for 65 hours",
        "severity_hint": "HIGH",
        "overdue_hours": 65,
        "carrier": "GHN",
        "destination": "Ha Noi",
        "failed_attempts": 1,
    }


def _base_history() -> dict:
    return {"previous_exception_count": 2, "last_exception_type": "stuck", "shipment_age_days": 4}


def test_detector_down_edge_case() -> None:
    payload = {
        "shipment": {
            "id": "s5-detector-down",
            "tracking_number": "TRK-S5-DOWN",
            "carrier": "GHN",
            "origin": "HCM",
            "destination": "HN",
            "expected_delivery": "2026-04-20T08:00:00+00:00",
            "actual_delivery": None,
            "status": "in_transit",
            "failed_attempts": 0,
            "last_updated": "2026-04-21T08:30:00+00:00",
        }
    }
    try:
        _http_post("http://localhost:8999/detect", payload, timeout=2)
        raise AssertionError("Detector down edge case should fail to connect")
    except urllib.error.URLError:
        # Expected: upstream detector unavailable.
        pass


def test_classifier_timeout_and_invalid_json_fallback() -> None:
    def timeout_call(_exception: dict, _history: dict) -> str:
        raise TimeoutError("classifier_timeout")

    timeout_result = classify_with_fallback(
        exception_data=_base_exception(),
        history=_base_history(),
        call_claude_api=timeout_call,
        model_name="gemini-2.5-flash",
    )
    assert timeout_result["fallback_used"] is True
    assert timeout_result["model_used"] == "rule_based_fallback"
    assert "classifier_timeout" in timeout_result["fallback_reason"]

    def invalid_json_call(_exception: dict, _history: dict) -> str:
        return "{invalid_json"

    invalid_result = classify_with_fallback(
        exception_data=_base_exception(),
        history=_base_history(),
        call_claude_api=invalid_json_call,
        model_name="gemini-2.5-flash",
    )
    assert invalid_result["fallback_used"] is True
    assert invalid_result["severity"] == "HIGH"


def test_wf3_duplicate_trigger_skip() -> None:
    duplicated = notifier_main.notify(
        notifier_main.NotifyRequest(
            exception_id="s5-dup-0001",
            severity="HIGH",
            exception_type="delay",
            overdue_hours=12,
            reason="duplicate notification test",
            ai_suggestion="none",
            carrier="GHN",
            is_already_notified=True,
            dry_run=True,
        )
    )
    assert duplicated["success"] is True
    assert duplicated["skipped_reason"] == "already_notified"


def test_telegram_fail_email_fallback() -> None:
    # Preserve module state then inject deterministic behavior for this edge case.
    original_bot = notifier_main.TELEGRAM_BOT_TOKEN
    original_ops = notifier_main.EMAIL_OPS_RECIPIENT
    original_manager = notifier_main.EMAIL_MANAGER_RECIPIENT
    original_send_email = notifier_main._send_email
    try:
        notifier_main.TELEGRAM_BOT_TOKEN = ""
        notifier_main.EMAIL_OPS_RECIPIENT = "ops@example.com"
        notifier_main.EMAIL_MANAGER_RECIPIENT = "manager@example.com"

        def fake_send_email(to_address: str, subject: str, body: str, dry_run: bool = False) -> str:
            _ = (subject, body, dry_run)
            return to_address

        notifier_main._send_email = fake_send_email

        result = notifier_main.notify(
            notifier_main.NotifyRequest(
                exception_id="s5-fallback-0001",
                severity="CRITICAL",
                exception_type="delay",
                overdue_hours=80,
                reason="telegram fallback to email",
                ai_suggestion="email fallback",
                carrier="GHN",
                dry_run=False,
            )
        )
        assert result["success"] is True
        assert "email" in result["channels_sent"]
        assert "telegram_ops" not in result["channels_sent"]
        assert "ops@example.com" in result["email_sent_to"]
    finally:
        notifier_main.TELEGRAM_BOT_TOKEN = original_bot
        notifier_main.EMAIL_OPS_RECIPIENT = original_ops
        notifier_main.EMAIL_MANAGER_RECIPIENT = original_manager
        notifier_main._send_email = original_send_email


def main() -> None:
    test_detector_down_edge_case()
    test_classifier_timeout_and_invalid_json_fallback()
    test_wf3_duplicate_trigger_skip()
    test_telegram_fail_email_fallback()
    print("S5 integration rehearsal passed: 4/4")


if __name__ == "__main__":
    main()
