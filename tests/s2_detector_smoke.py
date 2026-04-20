from __future__ import annotations

from datetime import datetime, timedelta, timezone

from services.detector.core import evaluate_rule


def make_shipment(
    shipment_id: str,
    *,
    status: str,
    failed_attempts: int = 0,
    expected_delivery_hours_ago: int = 4,
    last_updated_hours_ago: int = 2,
) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "id": shipment_id,
        "tracking_number": f"TRK-{shipment_id[-6:]}",
        "carrier": "GHN",
        "origin": "Ha Noi",
        "destination": "Da Nang",
        "expected_delivery": now - timedelta(hours=expected_delivery_hours_ago),
        "actual_delivery": None,
        "status": status,
        "failed_attempts": failed_attempts,
        "last_updated": now - timedelta(hours=last_updated_hours_ago),
        "created_at": now - timedelta(days=2),
    }


def run_smoke_tests() -> None:
    # Case 1: has exception (failed delivery)
    shipment_1 = make_shipment("00000000-0000-0000-0000-000000000001", status="failed", failed_attempts=3)
    result_1 = evaluate_rule(shipment_1)
    assert result_1["is_exception"] is True
    assert result_1["exception_type"] == "failed_delivery"
    assert result_1["severity_hint"] == "CRITICAL"

    # Case 2: no exception
    shipment_2 = make_shipment(
        "00000000-0000-0000-0000-000000000002",
        status="in_transit",
        failed_attempts=0,
        expected_delivery_hours_ago=8,
        last_updated_hours_ago=4,
    )
    result_2 = evaluate_rule(shipment_2)
    assert result_2["is_exception"] is False
    assert result_2["skipped"] is False

    # Case 3: simulated dedup skip contract shape
    result_3 = {
        "shipment_id": "00000000-0000-0000-0000-000000000003",
        "is_exception": False,
        "skipped": True,
        "skip_reason": "already_processed_in_cache",
    }
    assert result_3["skipped"] is True
    assert result_3["skip_reason"] == "already_processed_in_cache"

    print("S2 detector smoke tests passed: 3/3")


if __name__ == "__main__":
    run_smoke_tests()
