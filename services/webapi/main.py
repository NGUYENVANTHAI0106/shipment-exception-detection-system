from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import os
import time
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg
from psycopg.rows import dict_row
from psycopg.errors import UniqueViolation

JWT_SECRET = os.getenv("APP_JWT_SECRET", "dev-secret-change-me")
ACCESS_TTL_SECONDS = int(os.getenv("APP_ACCESS_TOKEN_EXPIRE_MINUTES", "480")) * 60
DB_DSN = os.getenv("WEBAPI_DB_DSN", "postgresql://shipment:shipment@postgres:5432/shipment")

app = FastAPI(title="shipment-webapi", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    username: str
    password: str


class ExceptionPatchRequest(BaseModel):
    status: str | None = None
    resolution_note: str | None = None


class ShipmentCreateRequest(BaseModel):
    """Admin tạo đơn mới vào shipments + ghi dòng lineage admin_shipment_entries."""

    tracking_number: str
    carrier: str
    origin: str
    destination: str
    expected_delivery: str
    status: str = "in_transit"
    failed_attempts: int = 0
    actual_delivery: str | None = None
    recipient_name: str | None = None
    recipient_phone: str | None = None
    recipient_address: str | None = None
    cod_amount: float | None = None
    weight_kg: float | None = None
    package_count: int | None = None
    product_summary: str | None = None
    last_scan_location: str | None = None
    last_scan_note: str | None = None
    intake_note: str | None = None


class ShipmentUpdateRequest(BaseModel):
    """PATCH shipments: chỉ các field được gửi (không đổi trường bỏ qua); intake_note tạo/cập nhật dòng admin_shipment_entries nếu có."""

    tracking_number: str | None = None
    carrier: str | None = None
    origin: str | None = None
    destination: str | None = None
    expected_delivery: str | None = None
    actual_delivery: str | None = None
    status: str | None = None
    failed_attempts: int | None = None
    recipient_name: str | None = None
    recipient_phone: str | None = None
    recipient_address: str | None = None
    cod_amount: float | None = None
    weight_kg: float | None = None
    package_count: int | None = None
    product_summary: str | None = None
    last_scan_location: str | None = None
    last_scan_note: str | None = None
    intake_note: str | None = None


class ManualExceptionCreateRequest(BaseModel):
    """Thêm một case vào exceptions (không cần detector/mock-data)."""

    shipment_id: str
    exception_type: str
    reason: str
    severity_hint: str = "MEDIUM"
    overdue_hours: float = 0


def _parse_iso_ts(value: str | None) -> datetime | None:
    if value is None or value == "":
        return None
    raw = value.strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _get_or_create_admin_account_id(username: str, display_name: str) -> str:
    """Khớp JWT sub với bảng admin_accounts (ưu tiên seed username admin)."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM admin_accounts WHERE username = %s",
            (username,),
        )
        row = cur.fetchone()
        if row:
            return str(row["id"])
        cur.execute(
            """
            INSERT INTO admin_accounts (username, display_name)
            VALUES (%s, %s)
            RETURNING id
            """,
            (username, display_name),
        )
        new_id = str(cur.fetchone()["id"])
        conn.commit()
        return new_id


# Single role system - all logged-in users have the same permissions.
USERS = {
    "admin": {"password": "admin123", "display_name": "Admin"},
}

# Backward-compatible logins (mapped to the same single role).
LEGACY_USERS = {
    "ops": "ops123",
    "manager": "manager123",
    "employee": "employee123",
}

# Simplified state machine: open -> in_progress -> resolved (resolved can be reopened).
ALLOWED_STATUSES = {"open", "in_progress", "resolved"}
ALLOWED_EXCEPTION_TYPES_ADMIN = {"delay", "failed_delivery", "address_issue", "stuck"}
ALLOWED_SEVERITY_HINTS_ADMIN = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
VALID_TRANSITIONS = {
    "open": {"in_progress", "resolved"},
    "in_progress": {"resolved", "open"},
    "resolved": {"in_progress"},
}

# Legacy status values still in DB get normalized to one of the three above.
LEGACY_STATUS_MAP = {
    "notified": "open",
    "investigating": "in_progress",
    "waiting_manager_review": "in_progress",
    "returned_to_ops": "in_progress",
}


def _normalize_status(status: str | None) -> str:
    if not status:
        return "open"
    return LEGACY_STATUS_MAP.get(status, status)


def _sla_hours_by_severity(severity: str) -> int:
    return {
        "CRITICAL": 2,
        "HIGH": 8,
        "MEDIUM": 24,
        "LOW": 48,
    }.get(severity, 24)


def _calculate_deadline(detected_at: datetime | None, severity: str) -> datetime:
    base = detected_at or datetime.now(timezone.utc)
    return base + timedelta(hours=_sla_hours_by_severity(severity))


def _ensure_auto_failed_delivery_case_from_shipment_snapshot(cur, shipment_id: str) -> None:
    """Khi nhập tay ghi đủ 2 lần giao thất bại, tự thêm một case để vào backlog xử lý (nếu chưa có case mở)."""
    cur.execute(
        """
        SELECT s.failed_attempts, s.tracking_number, m.intake_note
        FROM shipments s
        LEFT JOIN admin_shipment_entries m ON m.shipment_id = s.id
        WHERE s.id = %s::uuid
        """,
        (shipment_id,),
    )
    row = cur.fetchone()
    if not row:
        return
    failed_attempts = int(row["failed_attempts"] or 0)
    if failed_attempts < 2:
        return
    cur.execute(
        """
        SELECT COUNT(*)::int AS c FROM exceptions
        WHERE shipment_id = %s::uuid AND status <> 'resolved'
        """,
        (shipment_id,),
    )
    if cur.fetchone()["c"] > 0:
        return

    tn = row["tracking_number"] or shipment_id
    note = row.get("intake_note")
    reason_parts = [
        f"[Tự động – nhập đơn tay] Đơn có {failed_attempts} lần giao thất bại; mã vận đơn {tn}."
    ]
    if isinstance(note, str) and note.strip():
        reason_parts.append(f"Ghi chu: {note.strip()}")
    reason = " ".join(reason_parts)
    max_len = 1800
    if len(reason) > max_len:
        reason = reason[: max_len - 3] + "..."

    sev_hint = "HIGH" if failed_attempts >= 3 else "MEDIUM"
    deadline = _calculate_deadline(datetime.now(timezone.utc), sev_hint)
    overdue_hours = 0.0
    cur.execute(
        """
        INSERT INTO exceptions (
          shipment_id, exception_type, reason, severity_hint, overdue_hours,
          status, detected_at, deadline_at, sla_breached
        )
        VALUES (%s::uuid, %s, %s, %s, %s, 'open', NOW(), %s, FALSE)
        """,
        (
            shipment_id,
            "failed_delivery",
            reason,
            sev_hint,
            overdue_hours,
            deadline,
        ),
    )


def _connect():
    return psycopg.connect(DB_DSN, row_factory=dict_row)


def _ensure_schema() -> None:
    """Ensure required columns exist and one-time clean legacy status values."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            ALTER TABLE exceptions
              ADD COLUMN IF NOT EXISTS assignee TEXT,
              ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
              ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ,
              ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN NOT NULL DEFAULT FALSE
            """
        )
        # Normalize legacy statuses once on boot so the UI sees only 3 values.
        cur.execute(
            """
            UPDATE exceptions
            SET status = CASE status
                WHEN 'notified' THEN 'open'
                WHEN 'investigating' THEN 'in_progress'
                WHEN 'waiting_manager_review' THEN 'in_progress'
                WHEN 'returned_to_ops' THEN 'in_progress'
                ELSE status
            END
            WHERE status IN ('notified','investigating','waiting_manager_review','returned_to_ops')
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS admin_accounts (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              username TEXT NOT NULL UNIQUE,
              display_name TEXT NOT NULL,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS admin_shipment_entries (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              admin_account_id UUID NOT NULL REFERENCES admin_accounts(id) ON DELETE RESTRICT,
              shipment_id UUID NOT NULL UNIQUE REFERENCES shipments(id) ON DELETE CASCADE,
              intake_note TEXT,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_admin_shipment_entries_admin
              ON admin_shipment_entries(admin_account_id)
            """
        )
        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_admin_shipment_entries_created_at
              ON admin_shipment_entries(created_at DESC)
            """
        )
        cur.execute(
            """
            INSERT INTO admin_accounts (username, display_name)
            VALUES ('admin', 'Administrator')
            ON CONFLICT (username) DO NOTHING
            """
        )
        cur.execute(
            "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS manual_intake BOOLEAN NOT NULL DEFAULT FALSE"
        )
        cur.execute(
            """
            UPDATE shipments s
            SET manual_intake = TRUE
            FROM admin_shipment_entries e
            WHERE e.shipment_id = s.id
              AND s.manual_intake = FALSE
              AND ABS(EXTRACT(EPOCH FROM (e.created_at - s.created_at))) <= 120
            """
        )
        conn.commit()


def _serialize_exception(row: dict) -> dict:
    raw_in = row.get("shipment_intake_note")
    intake_trimmed = raw_in.strip() if isinstance(raw_in, str) and raw_in.strip() else None
    return {
        "id": str(row["id"]),
        "shipment_id": str(row["shipment_id"]),
        "tracking_number": row["tracking_number"],
        "carrier": row["carrier"],
        "origin": row["origin"],
        "destination": row["destination"],
        "shipment_status": row.get("shipment_status"),
        "failed_attempts": int(row["failed_attempts"] or 0) if row.get("failed_attempts") is not None else 0,
        "shipment_last_updated": row["shipment_last_updated"].isoformat() if row.get("shipment_last_updated") else None,
        "exception_type": row["exception_type"],
        "severity": row["severity"] or row["severity_hint"] or "LOW",
        "reason": row["reason"],
        "overdue_hours": float(row["overdue_hours"] or 0),
        "ai_suggestion": row["ai_suggestion"] or "",
        "confidence": float(row["confidence"] or 0),
        "fallback_used": bool(row.get("fallback_used", False)),
        "status": _normalize_status(row["status"]),
        "detected_at": row["detected_at"].isoformat() if row["detected_at"] else None,
        "expected_delivery": row["expected_delivery"].isoformat() if row.get("expected_delivery") else None,
        "notified_at": row["notified_at"].isoformat() if row["notified_at"] else None,
        "channels_sent": row["channels_sent"] or [],
        "resolution_note": row["resolution_note"] or "",
        "resolved_at": row["resolved_at"].isoformat() if row.get("resolved_at") else None,
        "assignee": row.get("assignee"),
        "assigned_at": row["assigned_at"].isoformat() if row.get("assigned_at") else None,
        "deadline_at": row["deadline_at"].isoformat() if row.get("deadline_at") else None,
        "sla_breached": bool(row.get("sla_breached", False)),
        "recipient_name": row.get("recipient_name"),
        "recipient_phone": row.get("recipient_phone"),
        "recipient_address": row.get("recipient_address"),
        "cod_amount": float(row["cod_amount"]) if row.get("cod_amount") is not None else None,
        "weight_kg": float(row["weight_kg"]) if row.get("weight_kg") is not None else None,
        "package_count": int(row["package_count"]) if row.get("package_count") is not None else None,
        "product_summary": row.get("product_summary"),
        "last_scan_location": row.get("last_scan_location"),
        "last_scan_note": row.get("last_scan_note"),
        "intake_note": intake_trimmed,
    }


def _audit(exception_id: str, action: str, actor: str, metadata: dict | None = None) -> None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO audit_logs (exception_id, action, actor, metadata)
            VALUES (%s, %s, %s, %s::jsonb)
            """,
            (exception_id, action, actor, json.dumps(metadata or {})),
        )


_EXCEPTION_SELECT_COLUMNS = """
  e.id,
  e.shipment_id,
  s.tracking_number,
  s.carrier,
  s.origin,
  s.destination,
  s.status AS shipment_status,
  s.failed_attempts,
  s.last_updated AS shipment_last_updated,
  s.expected_delivery,
  s.recipient_name,
  s.recipient_phone,
  s.recipient_address,
  s.cod_amount,
  s.weight_kg,
  s.package_count,
  s.product_summary,
  s.last_scan_location,
  s.last_scan_note,
  e.exception_type,
  e.severity,
  e.severity_hint,
  e.reason,
  e.overdue_hours,
  e.ai_suggestion,
  e.confidence,
  e.fallback_used,
  e.status,
  e.detected_at,
  e.notified_at,
  e.channels_sent,
  e.resolution_note,
  e.resolved_at,
  e.assignee,
  e.assigned_at,
  e.deadline_at,
  e.sla_breached,
  ae.intake_note AS shipment_intake_note
"""


def _exception_from_join_clause() -> str:
    """JOIN giữa exception, shipment và (tối đa một) dòng ghi chú vận hành intake."""
    return """
            FROM exceptions e
            JOIN shipments s ON s.id = e.shipment_id
            LEFT JOIN admin_shipment_entries ae ON ae.shipment_id = s.id
    """


def _list_exceptions() -> list[dict]:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {_EXCEPTION_SELECT_COLUMNS}
            {_exception_from_join_clause()}
            ORDER BY
              CASE WHEN e.status = 'resolved' THEN 1 ELSE 0 END,
              e.sla_breached DESC,
              e.deadline_at ASC NULLS LAST,
              e.detected_at DESC
            """
        )
        rows = cur.fetchall()
    return [_serialize_exception(row) for row in rows]


def _get_exception(exception_id: str) -> dict:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {_EXCEPTION_SELECT_COLUMNS}
            {_exception_from_join_clause()}
            WHERE e.id = %s
            """,
            (exception_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="exception_not_found")
    return _serialize_exception(row)


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode((data + padding).encode("utf-8"))


def create_access_token(payload: dict) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    body = {**payload, "iat": now, "exp": now + ACCESS_TTL_SECONDS}
    signing_input = f"{_b64(json.dumps(header).encode())}.{_b64(json.dumps(body).encode())}"
    signature = hmac.new(JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest()
    return f"{signing_input}.{_b64(signature)}"


def decode_access_token(token: str) -> dict:
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
        signing_input = f"{header_b64}.{payload_b64}"
        expected = hmac.new(JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64_decode(sig_b64)):
            raise ValueError("invalid_signature")
        payload = json.loads(_b64_decode(payload_b64).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("token_expired")
        return payload
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail=f"invalid_token:{exc}") from exc


def _sync_sla_flags() -> None:
    """Compute deadline_at for new rows, flag SLA breaches, and auto-resolve delivered shipments."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            UPDATE exceptions
            SET deadline_at = CASE
                  WHEN deadline_at IS NOT NULL THEN deadline_at
                  WHEN COALESCE(severity, severity_hint, 'LOW') = 'CRITICAL' THEN detected_at + INTERVAL '2 hours'
                  WHEN COALESCE(severity, severity_hint, 'LOW') = 'HIGH' THEN detected_at + INTERVAL '8 hours'
                  WHEN COALESCE(severity, severity_hint, 'LOW') = 'MEDIUM' THEN detected_at + INTERVAL '24 hours'
                  ELSE detected_at + INTERVAL '48 hours'
                END
            WHERE deadline_at IS NULL
            """
        )
        cur.execute(
            """
            UPDATE exceptions
            SET sla_breached = (deadline_at < NOW())
            WHERE status <> 'resolved'
            """
        )
        cur.execute(
            """
            UPDATE exceptions
            SET sla_breached = FALSE
            WHERE status = 'resolved'
            """
        )
        # Auto-resolve when the linked shipment has been delivered.
        cur.execute(
            """
            UPDATE exceptions e
            SET status = 'resolved',
                resolved_at = COALESCE(e.resolved_at, NOW()),
                sla_breached = FALSE,
                resolution_note = CASE
                    WHEN COALESCE(e.resolution_note, '') = '' THEN '[Hệ thống] Đơn đã giao thành công, tự đóng case.'
                    ELSE e.resolution_note || E'\n[Hệ thống] Đơn đã giao thành công, tự đóng case.'
                END
            FROM shipments s
            WHERE s.id = e.shipment_id
              AND s.actual_delivery IS NOT NULL
              AND e.status <> 'resolved'
            RETURNING e.id
            """
        )
        auto_resolved = [r["id"] for r in cur.fetchall()]
        conn.commit()
    for exception_id in auto_resolved:
        _audit(str(exception_id), "auto_resolved", "system", {"reason": "shipment_delivered"})


@app.on_event("startup")
async def startup() -> None:
    _ensure_schema()

    async def loop() -> None:
        while True:
            try:
                _sync_sla_flags()
            except Exception:  # noqa: BLE001
                pass
            await asyncio.sleep(60)

    asyncio.create_task(loop())


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    public_paths = {"/api/health", "/api/auth/login"}
    if path in public_paths or not path.startswith("/api/"):
        return await call_next(request)

    try:
        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="missing_bearer_token")
        token = auth_header.replace("Bearer ", "", 1).strip()
        payload = decode_access_token(token)
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    request.state.user = payload
    return await call_next(request)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/auth/login")
def login(payload: LoginRequest) -> dict:
    username = payload.username.strip()
    user = USERS.get(username)
    if user and user["password"] == payload.password:
        display_name = user["display_name"]
    elif LEGACY_USERS.get(username) == payload.password:
        # Allow old demo accounts but they all share the single-role identity.
        display_name = USERS["admin"]["display_name"]
        username = "admin"
    else:
        raise HTTPException(status_code=401, detail="invalid_credentials")
    token = create_access_token({"sub": username, "display_name": display_name})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"username": username, "display_name": display_name},
    }


@app.get("/api/me")
def me(request: Request) -> dict:
    user = request.state.user
    return {"username": user["sub"], "display_name": user.get("display_name", "")}


def _serialize_shipment_list_row(row: dict) -> dict:
    def iso(v: datetime | None) -> str | None:
        return v.isoformat() if v else None

    oe = int(row.get("open_exception_count") or 0)
    tid = row.get("primary_open_exception_id")
    return {
        "id": str(row["id"]),
        "tracking_number": row["tracking_number"],
        "carrier": row["carrier"],
        "origin": row["origin"],
        "destination": row["destination"],
        "status": row["status"],
        "failed_attempts": int(row["failed_attempts"] or 0),
        "expected_delivery": iso(row.get("expected_delivery")),
        "actual_delivery": iso(row.get("actual_delivery")),
        "last_updated": iso(row.get("last_updated")),
        "created_at": iso(row.get("created_at")),
        "open_exception_count": oe,
        "total_exception_count": int(row.get("total_exception_count") or 0),
        "primary_open_exception_id": str(tid) if tid else None,
        "manual_entry": bool(row.get("manual_entry")),
    }


@app.get("/api/shipments")
def list_shipments(request: Request, limit: int = 200, only: str = "all") -> list[dict]:
    """Danh sách vận đơn (shipments); có đếm exception chưa đóng để phân biệt đơn bình thường vs đang có case."""
    lim = max(1, min(limit, 500))
    filt = (only or "all").strip().lower()
    if filt not in ("all", "healthy", "has_issue"):
        raise HTTPException(status_code=400, detail="invalid_only_filter")

    where = ""
    if filt == "healthy":
        where = """
          WHERE NOT EXISTS (
            SELECT 1 FROM exceptions e
            WHERE e.shipment_id = s.id AND e.status <> 'resolved'
          )
        """
    elif filt == "has_issue":
        where = """
          WHERE EXISTS (
            SELECT 1 FROM exceptions e
            WHERE e.shipment_id = s.id AND e.status <> 'resolved'
          )
        """

    sql = f"""
        SELECT
          s.id,
          s.tracking_number,
          s.carrier,
          s.origin,
          s.destination,
          s.status,
          s.failed_attempts,
          s.expected_delivery,
          s.actual_delivery,
          s.last_updated,
          s.created_at,
          (SELECT COUNT(*)::int FROM exceptions e WHERE e.shipment_id = s.id AND e.status <> 'resolved') AS open_exception_count,
          (SELECT COUNT(*)::int FROM exceptions e WHERE e.shipment_id = s.id) AS total_exception_count,
          (SELECT e.id FROM exceptions e WHERE e.shipment_id = s.id AND e.status <> 'resolved'
             ORDER BY e.detected_at DESC NULLS LAST LIMIT 1) AS primary_open_exception_id,
          COALESCE(s.manual_intake, FALSE) AS manual_entry
        FROM shipments s
        {where}
        ORDER BY s.last_updated DESC NULLS LAST
        LIMIT %s
    """
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(sql, (lim,))
        rows = cur.fetchall()
    return [_serialize_shipment_list_row(r) for r in rows]


def _patch_shipments_table(cur, shipment_id: str, payload: ShipmentUpdateRequest) -> bool:
    """UPDATE shipments columns (không intake_note). True nếu có thực thi UPDATE."""
    sets: list[str] = []
    vals: list = []
    if payload.tracking_number is not None:
        sets.append("tracking_number = %s")
        vals.append(payload.tracking_number.strip())
    if payload.carrier is not None:
        sets.append("carrier = %s")
        vals.append(payload.carrier.strip())
    if payload.origin is not None:
        sets.append("origin = %s")
        vals.append(payload.origin.strip())
    if payload.destination is not None:
        sets.append("destination = %s")
        vals.append(payload.destination.strip())
    if payload.expected_delivery is not None:
        ed = _parse_iso_ts(payload.expected_delivery)
        if ed is None:
            raise HTTPException(status_code=400, detail="invalid_expected_delivery")
        sets.append("expected_delivery = %s")
        vals.append(ed)
    if payload.actual_delivery is not None:
        ad = _parse_iso_ts(payload.actual_delivery)
        sets.append("actual_delivery = %s")
        vals.append(ad)
    if payload.status is not None:
        sets.append("status = %s")
        vals.append(payload.status.strip())
    if payload.failed_attempts is not None:
        sets.append("failed_attempts = %s")
        vals.append(payload.failed_attempts)
    if payload.recipient_name is not None:
        sets.append("recipient_name = %s")
        vals.append(payload.recipient_name)
    if payload.recipient_phone is not None:
        sets.append("recipient_phone = %s")
        vals.append(payload.recipient_phone)
    if payload.recipient_address is not None:
        sets.append("recipient_address = %s")
        vals.append(payload.recipient_address)
    if payload.cod_amount is not None:
        sets.append("cod_amount = %s")
        vals.append(payload.cod_amount)
    if payload.weight_kg is not None:
        sets.append("weight_kg = %s")
        vals.append(payload.weight_kg)
    if payload.package_count is not None:
        sets.append("package_count = %s")
        vals.append(payload.package_count)
    if payload.product_summary is not None:
        sets.append("product_summary = %s")
        vals.append(payload.product_summary)
    if payload.last_scan_location is not None:
        sets.append("last_scan_location = %s")
        vals.append(payload.last_scan_location)
    if payload.last_scan_note is not None:
        sets.append("last_scan_note = %s")
        vals.append(payload.last_scan_note)
    if not sets:
        return False
    sets.append("last_updated = NOW()")
    vals.append(shipment_id)
    try:
        cur.execute(f"UPDATE shipments SET {', '.join(sets)} WHERE id = %s", vals)
    except UniqueViolation as exc:
        raise HTTPException(status_code=409, detail="duplicate_tracking_number_or_entry") from exc
    return True


def _upsert_intake_note(cur, shipment_id: str, admin_account_id: str, intake_note: str | None) -> None:
    """Tạo hoặc cập nhật ghi chú intake (chuỗi rỗng → NULL). Khác None nghĩa là có chỉnh sửa lineage."""
    note = intake_note.strip() if intake_note else None
    cur.execute(
        "SELECT id FROM admin_shipment_entries WHERE shipment_id = %s",
        (shipment_id,),
    )
    if cur.fetchone():
        cur.execute(
            """
            UPDATE admin_shipment_entries
            SET intake_note = %s
            WHERE shipment_id = %s
            """,
            (note, shipment_id),
        )
        return
    cur.execute(
        """
        INSERT INTO admin_shipment_entries (admin_account_id, shipment_id, intake_note)
        VALUES (%s::uuid, %s::uuid, %s)
        """,
        (admin_account_id, shipment_id, note),
    )


def _serialize_shipment_detail_row(row: dict) -> dict:
    def iso(v: datetime | None) -> str | None:
        return v.isoformat() if v else None

    oe = int(row.get("open_exception_count") or 0)
    tid = row.get("primary_open_exception_id")
    entry_id = row.get("admin_entry_id")
    return {
        "id": str(row["id"]),
        "tracking_number": row["tracking_number"],
        "carrier": row["carrier"],
        "origin": row["origin"],
        "destination": row["destination"],
        "status": row["status"],
        "failed_attempts": int(row["failed_attempts"] or 0),
        "expected_delivery": iso(row.get("expected_delivery")),
        "actual_delivery": iso(row.get("actual_delivery")),
        "last_updated": iso(row.get("last_updated")),
        "created_at": iso(row.get("created_at")),
        "recipient_name": row.get("recipient_name"),
        "recipient_phone": row.get("recipient_phone"),
        "recipient_address": row.get("recipient_address"),
        "cod_amount": float(row["cod_amount"]) if row.get("cod_amount") is not None else None,
        "weight_kg": float(row["weight_kg"]) if row.get("weight_kg") is not None else None,
        "package_count": int(row["package_count"]) if row.get("package_count") is not None else None,
        "product_summary": row.get("product_summary"),
        "last_scan_location": row.get("last_scan_location"),
        "last_scan_note": row.get("last_scan_note"),
        "open_exception_count": oe,
        "total_exception_count": int(row.get("total_exception_count") or 0),
        "primary_open_exception_id": str(tid) if tid else None,
        "manual_entry": bool(row.get("manual_intake", False)),
        "submission_id": str(entry_id) if entry_id else None,
        "intake_note": row.get("intake_note"),
        "admin_entry_created_at": iso(row.get("admin_entry_created_at")),
    }


SHIPMENT_DETAIL_SQL = """
SELECT
  s.id,
  s.tracking_number,
  s.carrier,
  s.origin,
  s.destination,
  s.status,
  s.failed_attempts,
  s.expected_delivery,
  s.actual_delivery,
  s.last_updated,
  s.created_at,
  s.manual_intake,
  s.recipient_name,
  s.recipient_phone,
  s.recipient_address,
  s.cod_amount,
  s.weight_kg,
  s.package_count,
  s.product_summary,
  s.last_scan_location,
  s.last_scan_note,
  e.id AS admin_entry_id,
  e.intake_note,
  e.created_at AS admin_entry_created_at,
  (SELECT COUNT(*)::int FROM exceptions ex WHERE ex.shipment_id = s.id AND ex.status <> 'resolved') AS open_exception_count,
  (SELECT COUNT(*)::int FROM exceptions ex WHERE ex.shipment_id = s.id) AS total_exception_count,
  (SELECT ex.id FROM exceptions ex WHERE ex.shipment_id = s.id AND ex.status <> 'resolved'
     ORDER BY ex.detected_at DESC NULLS LAST LIMIT 1) AS primary_open_exception_id
FROM shipments s
LEFT JOIN admin_shipment_entries e ON e.shipment_id = s.id
WHERE s.id = %s
"""


def _fetch_shipment_detail(shipment_id: str) -> dict:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(SHIPMENT_DETAIL_SQL, (shipment_id,))
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="shipment_not_found")
    return _serialize_shipment_detail_row(row)


@app.get("/api/shipments/{shipment_id}")
def get_shipment(shipment_id: str, request: Request) -> dict:
    return _fetch_shipment_detail(shipment_id)


@app.patch("/api/shipments/{shipment_id}")
def patch_shipment(shipment_id: str, payload: ShipmentUpdateRequest, request: Request) -> dict:
    """Sửa bất kỳ vận đơn nào; intake_note Upsert lineage khi được gửi."""
    username = request.state.user["sub"]
    display_name = request.state.user.get("display_name") or username
    admin_id = _get_or_create_admin_account_id(username, display_name)

    with _connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT id FROM shipments WHERE id = %s", (shipment_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="shipment_not_found")

        touched_s = _patch_shipments_table(cur, shipment_id, payload)
        touched_i = payload.intake_note is not None
        if touched_i:
            _upsert_intake_note(cur, shipment_id, admin_id, payload.intake_note)

        if not touched_s and not touched_i:
            conn.rollback()
            raise HTTPException(status_code=400, detail="no_fields_to_update")

        _ensure_auto_failed_delivery_case_from_shipment_snapshot(cur, shipment_id)
        conn.commit()

    return _fetch_shipment_detail(shipment_id)


@app.delete("/api/shipments/{shipment_id}")
def delete_shipment(shipment_id: str, request: Request) -> dict:
    """Xóa vận đơn (mọi nguồn); CASCADE exceptions/audit/logs theo FK."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM shipments WHERE id = %s RETURNING id, tracking_number",
            (shipment_id,),
        )
        row = cur.fetchone()
        conn.commit()
    if not row:
        raise HTTPException(status_code=404, detail="shipment_not_found")
    return {
        "deleted": True,
        "shipment_id": str(row["id"]),
        "tracking_number": row["tracking_number"],
    }


@app.post("/api/admin/exceptions")
def create_exception_admin(payload: ManualExceptionCreateRequest, request: Request) -> dict:
    """Mở case ngoại lệ thủ công trên một shipment (vận hành không cần detector)."""
    et = payload.exception_type.strip()
    if et not in ALLOWED_EXCEPTION_TYPES_ADMIN:
        raise HTTPException(status_code=400, detail="invalid_exception_type")
    sh = payload.severity_hint.strip().upper()
    if sh not in ALLOWED_SEVERITY_HINTS_ADMIN:
        raise HTTPException(status_code=400, detail="invalid_severity_hint")
    reason = payload.reason.strip()
    if not reason:
        raise HTTPException(status_code=400, detail="reason_required")

    with _connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT id FROM shipments WHERE id = %s", (payload.shipment_id.strip(),))
        ship = cur.fetchone()
        if not ship:
            raise HTTPException(status_code=404, detail="shipment_not_found")

        detected = datetime.now(timezone.utc)
        deadline = _calculate_deadline(detected, sh)

        cur.execute(
            """
            INSERT INTO exceptions (
              shipment_id, exception_type, reason, severity_hint, overdue_hours,
              status, detected_at, deadline_at, sla_breached
            )
            VALUES (%s::uuid, %s, %s, %s, %s, 'open', NOW(), %s, FALSE)
            RETURNING id
            """,
            (
                payload.shipment_id.strip(),
                et,
                reason,
                sh,
                payload.overdue_hours,
                deadline,
            ),
        )
        exc_id = str(cur.fetchone()["id"])
        conn.commit()

    return _get_exception(exc_id)


@app.post("/api/admin/shipments")
def create_shipment_admin(payload: ShipmentCreateRequest, request: Request) -> dict:
    """Tạo bản ghi shipments và ghi nhận admin nào đã nhập (admin_shipment_entries)."""
    user = request.state.user
    username = user["sub"]
    display_name = user.get("display_name") or username
    admin_id = _get_or_create_admin_account_id(username, display_name)
    expected_delivery = _parse_iso_ts(payload.expected_delivery)
    if expected_delivery is None:
        raise HTTPException(status_code=400, detail="invalid_expected_delivery")
    actual_delivery = _parse_iso_ts(payload.actual_delivery)
    tn = payload.tracking_number.strip()
    if not tn:
        raise HTTPException(status_code=400, detail="tracking_number_required")
    note = payload.intake_note.strip() if payload.intake_note else None

    insert_shipment_sql = """
        INSERT INTO shipments (
          tracking_number, carrier, origin, destination,
          expected_delivery, actual_delivery, status, failed_attempts, last_updated,
          recipient_name, recipient_phone, recipient_address,
          cod_amount, weight_kg, package_count, product_summary,
          last_scan_location, last_scan_note,
          manual_intake
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(),
                %s, %s, %s, %s, %s, %s, %s, %s, %s,
                TRUE)
        RETURNING id
    """
    vals = (
        tn,
        payload.carrier.strip(),
        payload.origin.strip(),
        payload.destination.strip(),
        expected_delivery,
        actual_delivery,
        payload.status.strip(),
        payload.failed_attempts,
        payload.recipient_name,
        payload.recipient_phone,
        payload.recipient_address,
        payload.cod_amount,
        payload.weight_kg,
        payload.package_count,
        payload.product_summary,
        payload.last_scan_location,
        payload.last_scan_note,
    )

    try:
        with _connect() as conn, conn.cursor() as cur:
            cur.execute(insert_shipment_sql, vals)
            shipment_id = str(cur.fetchone()["id"])
            cur.execute(
                """
                INSERT INTO admin_shipment_entries (admin_account_id, shipment_id, intake_note)
                VALUES (%s::uuid, %s::uuid, %s)
                RETURNING id
                """,
                (admin_id, shipment_id, note),
            )
            entry_id = str(cur.fetchone()["id"])
            _ensure_auto_failed_delivery_case_from_shipment_snapshot(cur, shipment_id)
            conn.commit()
    except UniqueViolation as exc:
        raise HTTPException(status_code=409, detail="duplicate_tracking_number_or_entry") from exc

    return {
        "shipment_id": shipment_id,
        "submission_id": entry_id,
        "tracking_number": tn,
        "created_by_username": username,
    }


def _serialize_manual_shipment_row(row: dict) -> dict:
    def iso(v: datetime | None) -> str | None:
        return v.isoformat() if v else None

    return {
        "submission_id": str(row["submission_id"]),
        "shipment_id": str(row["shipment_id"]),
        "entry_created_at": iso(row.get("entry_created_at")),
        "intake_note": row.get("intake_note"),
        "admin_username": row.get("admin_username"),
        "admin_display_name": row.get("admin_display_name"),
        "tracking_number": row["tracking_number"],
        "carrier": row["carrier"],
        "origin": row["origin"],
        "destination": row["destination"],
        "expected_delivery": iso(row.get("expected_delivery")),
        "actual_delivery": iso(row.get("actual_delivery")),
        "shipment_status": row.get("shipment_status"),
        "failed_attempts": int(row["failed_attempts"] or 0),
        "shipment_last_updated": iso(row.get("shipment_last_updated")),
        "shipment_created_at": iso(row.get("shipment_created_at")),
        "recipient_name": row.get("recipient_name"),
        "recipient_phone": row.get("recipient_phone"),
        "recipient_address": row.get("recipient_address"),
        "cod_amount": float(row["cod_amount"]) if row.get("cod_amount") is not None else None,
        "weight_kg": float(row["weight_kg"]) if row.get("weight_kg") is not None else None,
        "package_count": int(row["package_count"]) if row.get("package_count") is not None else None,
        "product_summary": row.get("product_summary"),
        "last_scan_location": row.get("last_scan_location"),
        "last_scan_note": row.get("last_scan_note"),
    }


_MANUAL_SHIPMENT_SELECT = """
  e.id AS submission_id,
  e.created_at AS entry_created_at,
  e.intake_note,
  aa.username AS admin_username,
  aa.display_name AS admin_display_name,
  s.id AS shipment_id,
  s.tracking_number,
  s.carrier,
  s.origin,
  s.destination,
  s.expected_delivery,
  s.actual_delivery,
  s.status AS shipment_status,
  s.failed_attempts,
  s.last_updated AS shipment_last_updated,
  s.created_at AS shipment_created_at,
  s.recipient_name,
  s.recipient_phone,
  s.recipient_address,
  s.cod_amount,
  s.weight_kg,
  s.package_count,
  s.product_summary,
  s.last_scan_location,
  s.last_scan_note
"""


@app.get("/api/admin/shipments/manual")
def list_manual_shipments(request: Request, limit: int = 50) -> list[dict]:
    lim = max(1, min(limit, 200))
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {_MANUAL_SHIPMENT_SELECT}
            FROM admin_shipment_entries e
            JOIN admin_accounts aa ON aa.id = e.admin_account_id
            JOIN shipments s ON s.id = e.shipment_id
            ORDER BY e.created_at DESC
            LIMIT %s
            """,
            (lim,),
        )
        rows = cur.fetchall()
    return [_serialize_manual_shipment_row(r) for r in rows]


@app.get("/api/admin/shipments/manual/{shipment_id}")
def get_manual_shipment(shipment_id: str, request: Request) -> dict:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {_MANUAL_SHIPMENT_SELECT}
            FROM admin_shipment_entries e
            JOIN admin_accounts aa ON aa.id = e.admin_account_id
            JOIN shipments s ON s.id = e.shipment_id
            WHERE s.id = %s
            """,
            (shipment_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="manual_shipment_not_found")
    return _serialize_manual_shipment_row(row)


@app.patch("/api/admin/shipments/manual/{shipment_id}")
def update_manual_shipment(
    shipment_id: str, payload: ShipmentUpdateRequest, request: Request
) -> dict:
    username = request.state.user["sub"]
    display_name = request.state.user.get("display_name") or username
    admin_id = _get_or_create_admin_account_id(username, display_name)

    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM admin_shipment_entries WHERE shipment_id = %s",
            (shipment_id,),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="manual_shipment_not_found")

        touched_s = _patch_shipments_table(cur, shipment_id, payload)
        touched_i = payload.intake_note is not None
        if touched_i:
            _upsert_intake_note(cur, shipment_id, admin_id, payload.intake_note)

        if not touched_s and not touched_i:
            conn.rollback()
            raise HTTPException(status_code=400, detail="no_fields_to_update")

        _ensure_auto_failed_delivery_case_from_shipment_snapshot(cur, shipment_id)
        conn.commit()

    return get_manual_shipment(shipment_id, request)


@app.delete("/api/admin/shipments/manual/{shipment_id}")
def delete_manual_shipment(shipment_id: str, request: Request) -> dict:
    """Xóa đơn khỏi shipments (có dòng admin_shipment_entries); cascade xóa entry + exceptions liên quan."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM shipments s
            WHERE s.id = %s
              AND EXISTS (
                SELECT 1 FROM admin_shipment_entries e WHERE e.shipment_id = s.id
              )
            RETURNING s.id, s.tracking_number
            """,
            (shipment_id,),
        )
        row = cur.fetchone()
        conn.commit()
    if not row:
        raise HTTPException(status_code=404, detail="manual_shipment_not_found")
    return {
        "deleted": True,
        "shipment_id": str(row["id"]),
        "tracking_number": row["tracking_number"],
    }


@app.get("/api/exceptions")
def list_exceptions(request: Request) -> list[dict]:
    _sync_sla_flags()
    return _list_exceptions()


@app.get("/api/exceptions/{exception_id}")
def get_exception(exception_id: str, request: Request) -> dict:
    return _get_exception(exception_id)


@app.patch("/api/exceptions/{exception_id}")
def patch_exception(exception_id: str, payload: ExceptionPatchRequest, request: Request) -> dict:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, status, assignee, resolution_note, detected_at, severity, severity_hint
            FROM exceptions WHERE id = %s
            """,
            (exception_id,),
        )
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="exception_not_found")

        actor = request.state.user["sub"]
        current_status = _normalize_status(existing["status"])
        next_status_raw = _normalize_status(payload.status) if payload.status else current_status
        if next_status_raw not in ALLOWED_STATUSES:
            raise HTTPException(status_code=400, detail="invalid_status")
        if next_status_raw != current_status and next_status_raw not in VALID_TRANSITIONS[current_status]:
            raise HTTPException(status_code=400, detail=f"invalid_transition:{current_status}->{next_status_raw}")

        resolved_at = datetime.now(timezone.utc) if next_status_raw == "resolved" else None

        cur.execute(
            """
            UPDATE exceptions
            SET
              status = %s,
              resolution_note = COALESCE(%s, resolution_note),
              resolved_at = CASE
                WHEN %s::timestamptz IS NOT NULL THEN %s::timestamptz
                WHEN %s = 'resolved' THEN resolved_at
                ELSE NULL
              END,
              sla_breached = CASE
                WHEN %s = 'resolved' THEN FALSE
                WHEN deadline_at IS NOT NULL THEN deadline_at < NOW()
                ELSE sla_breached
              END
            WHERE id = %s
            """,
            (
                next_status_raw,
                payload.resolution_note,
                resolved_at,
                resolved_at,
                next_status_raw,
                next_status_raw,
                exception_id,
            ),
        )
        conn.commit()

    updated = _get_exception(exception_id)
    note_changed = payload.resolution_note is not None and payload.resolution_note != (existing["resolution_note"] or "")
    status_changed = next_status_raw != current_status
    if status_changed or note_changed:
        _audit(
            exception_id,
            "updated_from_web",
            actor,
            {
                "old": {"status": current_status, "resolution_note": existing["resolution_note"]},
                "new": {"status": updated["status"], "resolution_note": updated.get("resolution_note")},
            },
        )
    return updated


@app.post("/api/exceptions/{exception_id}/claim")
def claim_exception(exception_id: str, request: Request) -> dict:
    actor = request.state.user["sub"]
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT assignee, status FROM exceptions WHERE id = %s", (exception_id,))
        before = cur.fetchone()
        if not before:
            raise HTTPException(status_code=404, detail="exception_not_found")
        cur.execute(
            """
            UPDATE exceptions
            SET assignee = %s,
                assigned_at = NOW(),
                status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END
            WHERE id = %s
            """,
            (actor, exception_id),
        )
        conn.commit()
    updated = _get_exception(exception_id)
    _audit(
        exception_id,
        "claimed_from_web",
        actor,
        {
            "old": {"assignee": before["assignee"], "status": _normalize_status(before["status"])},
            "new": {"assignee": updated.get("assignee"), "status": updated["status"]},
        },
    )
    return updated


NOTIFIER_URL = os.getenv("NOTIFIER_URL", "http://notifier:8003")


class CustomerActionRequest(BaseModel):
    template: str


CUSTOMER_TEMPLATES: dict[str, dict[str, str]] = {
    "reschedule": {
        "title": "Hen lich giao lai voi khach",
        "body": "Xin chao {recipient_name}, don {tracking_number} cua quy khach dang bi tre. Trung tam van hanh da lien he hang van chuyen va se giao lai vao khung gio sap toi. Vui long de y dien thoai {recipient_phone}.",
    },
    "verify_address": {
        "title": "Xac minh dia chi giao",
        "body": "Xin chao {recipient_name}, don {tracking_number} can xac minh lai dia chi: '{recipient_address}'. Vui long phan hoi qua so {recipient_phone} de chung toi giao chinh xac.",
    },
    "confirm_failed": {
        "title": "Xac nhan giao lai sau {failed_attempts} lan that bai",
        "body": "Xin chao {recipient_name}, don {tracking_number} da co {failed_attempts} lan giao that bai. Vui long lien he lai voi hang qua so {recipient_phone} de chot phuong an cuoi cung.",
    },
}


def _http_post_json(url: str, payload: dict, timeout: int = 10) -> dict:
    import urllib.request

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


@app.post("/api/exceptions/{exception_id}/customer-notify")
def notify_customer(exception_id: str, request: Request, payload: CustomerActionRequest) -> dict:
    actor = request.state.user["sub"]
    if payload.template not in CUSTOMER_TEMPLATES:
        raise HTTPException(status_code=400, detail="unknown_template")
    item = _get_exception(exception_id)
    template = CUSTOMER_TEMPLATES[payload.template]
    fmt = {
        "recipient_name": item.get("recipient_name") or "quy khach",
        "recipient_phone": item.get("recipient_phone") or "",
        "recipient_address": item.get("recipient_address") or "",
        "tracking_number": item.get("tracking_number") or "",
        "failed_attempts": item.get("failed_attempts") or 0,
    }
    title = template["title"].format(**fmt)
    body = template["body"].format(**fmt)

    delivery: dict = {"channel": "customer_log", "success": True}
    try:
        delivery = _http_post_json(
            f"{NOTIFIER_URL}/notify-customer",
            {
                "exception_id": exception_id,
                "tracking_number": item.get("tracking_number"),
                "recipient_name": item.get("recipient_name"),
                "recipient_phone": item.get("recipient_phone"),
                "title": title,
                "body": body,
                "template": payload.template,
            },
            timeout=8,
        )
    except Exception as exc:  # noqa: BLE001
        delivery = {"channel": "log_only", "success": False, "error": str(exc)}

    next_status = "in_progress" if _normalize_status(item["status"]) == "open" else _normalize_status(item["status"])
    note_line = f"[{datetime.now(timezone.utc).strftime('%H:%M %d/%m')}] {title}"
    new_note = (item.get("resolution_note") or "").strip()
    new_note = f"{new_note}\n{note_line}".strip() if new_note else note_line
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            UPDATE exceptions
            SET status = %s, resolution_note = %s
            WHERE id = %s
            """,
            (next_status, new_note, exception_id),
        )
        conn.commit()
    _audit(
        exception_id,
        "customer_notified",
        actor,
        {
            "template": payload.template,
            "title": title,
            "body": body,
            "delivery": delivery,
        },
    )
    return {
        "exception": _get_exception(exception_id),
        "delivery": delivery,
        "title": title,
        "body": body,
    }


@app.get("/api/audit-logs")
def list_audit_logs(request: Request, exception_id: str) -> list[dict]:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, exception_id, action, actor, metadata, created_at
            FROM audit_logs
            WHERE exception_id = %s
              AND action NOT IN ('view_detail')
            ORDER BY created_at DESC
            LIMIT 100
            """,
            (exception_id,),
        )
        rows = cur.fetchall()
    return [
        {
            "id": str(row["id"]),
            "exception_id": str(row["exception_id"]),
            "action": row["action"],
            "actor": row["actor"],
            "metadata": row["metadata"] or {},
            "created_at": row["created_at"].isoformat(),
        }
        for row in rows
    ]


@app.get("/api/stats")
def stats(request: Request) -> dict:
    """Tiny KPI block for the single dashboard."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT
              COUNT(*) FILTER (WHERE status <> 'resolved')::int AS open_total,
              COUNT(*) FILTER (WHERE status <> 'resolved' AND COALESCE(severity, severity_hint, 'LOW') = 'CRITICAL')::int AS critical_total,
              COUNT(*) FILTER (WHERE status <> 'resolved' AND sla_breached)::int AS breached_total,
              COUNT(*) FILTER (WHERE status <> 'resolved' AND assignee IS NULL)::int AS unassigned_total,
              COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at >= NOW() - INTERVAL '24 hours')::int AS resolved_24h
            FROM exceptions
            """
        )
        row = cur.fetchone() or {}
    return {
        "open_total": int(row.get("open_total", 0)),
        "critical_total": int(row.get("critical_total", 0)),
        "breached_total": int(row.get("breached_total", 0)),
        "unassigned_total": int(row.get("unassigned_total", 0)),
        "resolved_24h": int(row.get("resolved_24h", 0)),
    }
