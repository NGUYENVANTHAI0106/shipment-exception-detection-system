"""Bơm đúng 1 shipment vào pipeline để phân tích end-to-end.

Chạy từ trong network docker (ví dụ exec vào container `api`):
    docker exec -i shipment-exception-detection-system-api-1 python scripts/replay_one_exception.py
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone

import psycopg

DSN = os.getenv("WEBAPI_DB_DSN", "postgresql://shipment:shipment@postgres:5432/shipment")
DETECTOR_URL = os.getenv("DETECTOR_URL", "http://detector:8001/detect")
N8N_WF2_URL = os.getenv("N8N_WF2_URL", "http://n8n:5678/webhook/wf2-classify")


def banner(title: str) -> None:
    print()
    print("=" * 78)
    print(title)
    print("=" * 78)


def http_post(url: str, payload: dict, timeout: int = 30) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8")
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return {"raw": body}


def main() -> int:
    now = datetime.now(timezone.utc)
    shipment_id = str(uuid.uuid4())
    tracking_number = f"TRK-DEMO-{int(time.time())}"

    shipment = {
        "id": shipment_id,
        "tracking_number": tracking_number,
        "carrier": "GHN",
        "origin": "Hà Nội",
        "destination": "Đà Nẵng",
        "expected_delivery": (now - timedelta(hours=75)).isoformat(),
        "actual_delivery": None,
        "status": "in_transit",
        "failed_attempts": 0,
        "last_updated": (now - timedelta(hours=6)).isoformat(),
        "created_at": (now - timedelta(days=3)).isoformat(),
        "recipient_name": "Nguyễn Thị Lan",
        "recipient_phone": "0901234567",
        "recipient_address": "128 Lê Lợi, Hải Châu, Đà Nẵng",
        "cod_amount": 1450000,
        "weight_kg": 0.8,
        "package_count": 1,
        "product_summary": "Tai nghe Sony WH-1000XM4 màu đen + cáp sạc",
        "last_scan_location": "Hub miền Trung Đà Nẵng",
        "last_scan_note": "Chờ kết nối chuyến kế tiếp (đã quá 24 giờ)",
    }

    banner("BƯỚC 1 — Shipment đầu vào (mock có chủ đích: trễ 75h, đang in_transit)")
    print(json.dumps(shipment, indent=2, ensure_ascii=False))

    with psycopg.connect(DSN, autocommit=True) as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO shipments (
              id, tracking_number, carrier, origin, destination,
              expected_delivery, actual_delivery, status, failed_attempts,
              last_updated, created_at,
              recipient_name, recipient_phone, recipient_address,
              cod_amount, weight_kg, package_count, product_summary,
              last_scan_location, last_scan_note
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, %s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                shipment["id"],
                shipment["tracking_number"],
                shipment["carrier"],
                shipment["origin"],
                shipment["destination"],
                shipment["expected_delivery"],
                shipment["actual_delivery"],
                shipment["status"],
                shipment["failed_attempts"],
                shipment["last_updated"],
                shipment["created_at"],
                shipment["recipient_name"],
                shipment["recipient_phone"],
                shipment["recipient_address"],
                shipment["cod_amount"],
                shipment["weight_kg"],
                shipment["package_count"],
                shipment["product_summary"],
                shipment["last_scan_location"],
                shipment["last_scan_note"],
            ),
        )

    banner("BƯỚC 2 — Gọi detector /detect (áp dụng rule)")
    detect_resp = http_post(DETECTOR_URL, {"shipment": shipment})
    print(json.dumps(detect_resp, indent=2, ensure_ascii=False))

    if not detect_resp.get("is_exception"):
        print("Detector không gắn cờ exception. Dừng.")
        return 1

    banner("BƯỚC 3 — Insert exception vào DB")
    exception_id = str(uuid.uuid4())
    with psycopg.connect(DSN, autocommit=True) as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO exceptions (
              id, shipment_id, exception_type, reason, severity_hint,
              overdue_hours, status, detected_at
            ) VALUES (%s,%s,%s,%s,%s,%s,'open', NOW())
            """,
            (
                exception_id,
                shipment_id,
                detect_resp["exception_type"],
                detect_resp["reason"],
                detect_resp["severity_hint"],
                detect_resp["overdue_hours"],
            ),
        )
    print(f"exception_id = {exception_id}")

    banner("BƯỚC 4 — Trigger WF2 (classify) qua n8n webhook")
    try:
        wf2_resp = http_post(N8N_WF2_URL, {"exception_id": exception_id}, timeout=60)
        print(json.dumps(wf2_resp, indent=2, ensure_ascii=False)[:1200])
    except Exception as exc:
        print(f"WF2 webhook lỗi: {exc}")
        print("Workflow có thể chưa Active. Bỏ qua, vẫn dump state cuối.")

    print("Chờ pipeline xử lý...")
    time.sleep(4)

    banner("BƯỚC 5 — Trạng thái cuối cùng trong DB")
    with psycopg.connect(DSN, row_factory=psycopg.rows.dict_row) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT e.id, e.exception_type, e.reason, e.severity_hint, e.severity,
                   e.overdue_hours, e.confidence, e.fallback_used, e.classified_at,
                   e.ai_suggestion, e.status, e.notified_at, e.channels_sent,
                   e.is_escalated, s.tracking_number, s.carrier
            FROM exceptions e JOIN shipments s ON s.id = e.shipment_id
            WHERE e.id = %s
            """,
            (exception_id,),
        )
        row = cur.fetchone()
        print(json.dumps(row, indent=2, default=str, ensure_ascii=False))

        cur.execute(
            "SELECT action, actor, metadata, created_at FROM audit_logs WHERE exception_id = %s ORDER BY created_at",
            (exception_id,),
        )
        logs = cur.fetchall()
        print("\nAudit logs:")
        print(json.dumps(logs, indent=2, default=str, ensure_ascii=False))

    banner("XONG")
    print(f"Mở trên UI: http://localhost:3000/exceptions/{exception_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
