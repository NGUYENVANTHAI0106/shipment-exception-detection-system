from __future__ import annotations

import json
import subprocess
import urllib.request

ROOT = "/home/zsky/mydata/Projects/shipment-exception-detection-system"
EXCEPTION_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
SHIPMENT_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff"


def run_sql(sql: str) -> str:
    command = [
        "docker",
        "compose",
        "exec",
        "-T",
        "postgres",
        "psql",
        "-U",
        "shipment",
        "-d",
        "shipment",
        "-At",
        "-c",
        sql,
    ]
    result = subprocess.run(
        command,
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def http_post(url: str, payload: dict) -> dict:
    req = urllib.request.Request(
        url,
        method="POST",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def setup_data() -> None:
    run_sql(
        f"""
        INSERT INTO shipments (id, tracking_number, carrier, origin, destination, expected_delivery, status, failed_attempts, last_updated)
        VALUES ('{SHIPMENT_ID}', 'TRK-INTEG-S34', 'GHN', 'Ha Noi', 'Da Nang', NOW() - INTERVAL '3 day', 'in_transit', 0, NOW() - INTERVAL '10 hour')
        ON CONFLICT (tracking_number) DO UPDATE SET carrier = EXCLUDED.carrier;
        """
    )
    run_sql(
        f"""
        INSERT INTO exceptions (id, shipment_id, exception_type, reason, severity_hint, overdue_hours, status)
        VALUES ('{EXCEPTION_ID}', '{SHIPMENT_ID}', 'delay', 'Integration test overdue', 'HIGH', 60, 'open')
        ON CONFLICT (id) DO UPDATE SET status = 'open', notified_at = NULL, channels_sent = NULL, is_escalated = FALSE, severity = NULL, ai_suggestion = NULL, confidence = NULL, fallback_used = FALSE, classified_at = NULL;
        DELETE FROM audit_logs WHERE exception_id = '{EXCEPTION_ID}';
        """
    )


def test_classifier_success_and_fallback() -> dict:
    success_payload = {
        "exception_data": {
            "exception_type": "delay",
            "reason": "Integration test overdue",
            "severity_hint": "HIGH",
            "overdue_hours": 60,
            "carrier": "GHN",
            "destination": "Da Nang",
            "_mock_gemini_response": json.dumps(
                {
                    "severity": "CRITICAL",
                    "exception_type": "delay",
                    "suggested_action": "Call carrier command center immediately.",
                    "escalate_to_manager": True,
                    "confidence": 0.95,
                }
            ),
        },
        "history_context": {"previous_exception_count": 1, "last_exception_type": "delay", "shipment_age_days": 2},
    }
    success = http_post("http://localhost:8002/classify", success_payload)
    assert success["fallback_used"] is False
    assert success["severity"] == "CRITICAL"

    fallback_payload = {
        "exception_data": {
            "exception_type": "delay",
            "reason": "Integration test overdue",
            "severity_hint": "HIGH",
            "overdue_hours": 60,
            "carrier": "GHN",
            "destination": "Da Nang",
        },
        "history_context": {"previous_exception_count": 1, "last_exception_type": "delay", "shipment_age_days": 2},
    }
    fallback = http_post("http://localhost:8002/classify", fallback_payload)
    assert fallback["fallback_used"] is True
    assert fallback["severity"] == "HIGH"
    return success


def apply_wf2_db_update(classified: dict) -> None:
    run_sql(
        f"""
        UPDATE exceptions
        SET severity = '{classified["severity"]}',
            ai_suggestion = '{classified["suggested_action"].replace("'", "''")}',
            confidence = {classified["confidence"]},
            fallback_used = {'TRUE' if classified["fallback_used"] else 'FALSE'},
            classified_at = NOW()
        WHERE id = '{EXCEPTION_ID}';
        """
    )
    result = run_sql(f"SELECT severity, fallback_used FROM exceptions WHERE id = '{EXCEPTION_ID}';")
    assert result.startswith("CRITICAL|f")


def test_wf3_phase2_updates() -> None:
    notify_payload = {
        "exception_id": EXCEPTION_ID,
        "severity": "CRITICAL",
        "exception_type": "delay",
        "overdue_hours": 60,
        "reason": "Integration test overdue",
        "ai_suggestion": "Call carrier command center immediately.",
        "carrier": "GHN",
        "is_already_notified": False,
        "dry_run": True,
    }
    notify = http_post("http://localhost:8003/notify", notify_payload)
    assert notify["success"] is True
    assert "telegram_ops" in notify["channels_sent"]

    run_sql(
        f"""
        UPDATE exceptions
        SET status = 'notified', notified_at = NOW(), channels_sent = ARRAY['telegram_ops','telegram_manager','email'], is_escalated = TRUE
        WHERE id = '{EXCEPTION_ID}';
        INSERT INTO audit_logs (exception_id, action, actor, metadata)
        VALUES ('{EXCEPTION_ID}', 'notified', 'system', '{{"channels_sent":["telegram_ops","telegram_manager","email"]}}'::jsonb);
        INSERT INTO audit_logs (exception_id, action, actor, metadata)
        VALUES ('{EXCEPTION_ID}', 'escalated', 'system', '{{"channels_sent":["telegram_manager"]}}'::jsonb);
        """
    )

    status_row = run_sql(f"SELECT status, is_escalated FROM exceptions WHERE id = '{EXCEPTION_ID}';")
    assert status_row == "notified|t"
    audit_count = run_sql(
        f"SELECT COUNT(*) FROM audit_logs WHERE exception_id = '{EXCEPTION_ID}' AND action IN ('notified','escalated');"
    )
    assert audit_count == "2"

    duplicate = http_post(
        "http://localhost:8003/notify",
        {**notify_payload, "is_already_notified": True},
    )
    assert duplicate["skipped_reason"] == "already_notified"


def main() -> None:
    setup_data()
    success = test_classifier_success_and_fallback()
    apply_wf2_db_update(success)
    test_wf3_phase2_updates()
    print("S3/S4 integration passed: classifier + wf2 updates + wf3 phase2 effects")


if __name__ == "__main__":
    main()
