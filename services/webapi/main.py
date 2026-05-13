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
        conn.commit()


def _serialize_exception(row: dict) -> dict:
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
  e.sla_breached
"""


def _list_exceptions() -> list[dict]:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {_EXCEPTION_SELECT_COLUMNS}
            FROM exceptions e
            JOIN shipments s ON s.id = e.shipment_id
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
            FROM exceptions e
            JOIN shipments s ON s.id = e.shipment_id
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
