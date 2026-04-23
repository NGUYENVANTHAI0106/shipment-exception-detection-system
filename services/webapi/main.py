from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg
from psycopg.rows import dict_row

Role = Literal["ops", "employee"]

JWT_SECRET = os.getenv("APP_JWT_SECRET", "dev-secret-change-me")
ACCESS_TTL_SECONDS = int(os.getenv("APP_ACCESS_TOKEN_EXPIRE_MINUTES", "480")) * 60
DB_DSN = os.getenv("WEBAPI_DB_DSN", "postgresql://shipment:shipment@postgres:5432/shipment")

app = FastAPI(title="shipment-webapi", version="0.1.0")
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
    assignee: str | None = None
    assigned_team: str | None = None


class AssignExceptionRequest(BaseModel):
    assignee: str
    assigned_team: str | None = None


USERS = {
    "ops": {"password": "ops123", "role": "ops", "display_name": "Ops User"},
    "employee": {"password": "employee123", "role": "employee", "display_name": "Nhân viên"},
}

ALLOWED_STATUSES = {
    "open",
    "notified",
    "in_progress",
    "waiting_manager_review",
    "returned_to_ops",
    "resolved",
    "investigating",
}


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


def _ensure_s7_columns() -> None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            ALTER TABLE exceptions
              ADD COLUMN IF NOT EXISTS assignee TEXT,
              ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
              ADD COLUMN IF NOT EXISTS assigned_team TEXT,
              ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ,
              ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN NOT NULL DEFAULT FALSE
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
        "exception_type": row["exception_type"],
        "severity": row["severity"] or row["severity_hint"] or "LOW",
        "reason": row["reason"],
        "overdue_hours": float(row["overdue_hours"] or 0),
        "ai_suggestion": row["ai_suggestion"] or "",
        "confidence": float(row["confidence"] or 0),
        "status": row["status"],
        "detected_at": row["detected_at"].isoformat() if row["detected_at"] else None,
        "notified_at": row["notified_at"].isoformat() if row["notified_at"] else None,
        "channels_sent": row["channels_sent"] or [],
        "is_escalated": bool(row["is_escalated"]),
        "resolution_note": row["resolution_note"] or "",
        "assignee": row.get("assignee"),
        "assigned_at": row["assigned_at"].isoformat() if row.get("assigned_at") else None,
        "assigned_team": row.get("assigned_team"),
        "deadline_at": row["deadline_at"].isoformat() if row.get("deadline_at") else None,
        "sla_breached": bool(row.get("sla_breached", False)),
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


def _list_exceptions_for_role(role: Role) -> list[dict]:
    where_clause = "WHERE COALESCE(e.severity, e.severity_hint, 'LOW') <> 'CRITICAL'" if role == "employee" else ""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT
              e.id,
              e.shipment_id,
              s.tracking_number,
              s.carrier,
              s.origin,
              s.destination,
              e.exception_type,
              e.severity,
              e.severity_hint,
              e.reason,
              e.overdue_hours,
              e.ai_suggestion,
              e.confidence,
              e.status,
              e.detected_at,
              e.notified_at,
              e.channels_sent,
              e.is_escalated,
              e.resolution_note,
              e.assignee,
              e.assigned_at,
              e.assigned_team,
              e.deadline_at,
              e.sla_breached
            FROM exceptions e
            JOIN shipments s ON s.id = e.shipment_id
            {where_clause}
            ORDER BY e.sla_breached DESC, e.deadline_at ASC NULLS LAST, e.detected_at DESC
            """
        )
        rows = cur.fetchall()
    return [_serialize_exception(row) for row in rows]


def _get_exception_for_role(exception_id: str, role: Role) -> dict:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT
              e.id,
              e.shipment_id,
              s.tracking_number,
              s.carrier,
              s.origin,
              s.destination,
              e.exception_type,
              e.severity,
              e.severity_hint,
              e.reason,
              e.overdue_hours,
              e.ai_suggestion,
              e.confidence,
              e.status,
              e.detected_at,
              e.notified_at,
              e.channels_sent,
              e.is_escalated,
              e.resolution_note,
              e.assignee,
              e.assigned_at,
              e.assigned_team,
              e.deadline_at,
              e.sla_breached
            FROM exceptions e
            JOIN shipments s ON s.id = e.shipment_id
            WHERE e.id = %s
            """,
            (exception_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="exception_not_found")
    severity = row["severity"] or row["severity_hint"] or "LOW"
    if role == "employee" and severity == "CRITICAL":
        raise HTTPException(status_code=403, detail="forbidden_critical_for_employee")
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
        conn.commit()


@app.on_event("startup")
async def startup_sla_loop() -> None:
    _ensure_s7_columns()

    async def loop() -> None:
        while True:
            try:
                _sync_sla_flags()
            except Exception:
                pass
            await asyncio.sleep(60)

    asyncio.create_task(loop())


@app.middleware("http")
async def auth_and_rbac_middleware(request: Request, call_next):
    path = request.url.path
    public_paths = {"/api/health", "/api/auth/login"}
    if path in public_paths:
        return await call_next(request)

    if not path.startswith("/api/"):
        return await call_next(request)

    try:
        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="missing_bearer_token")
        token = auth_header.replace("Bearer ", "", 1).strip()
        payload = decode_access_token(token)
        role = payload.get("role")
        if role not in {"ops", "employee"}:
            raise HTTPException(status_code=401, detail="invalid_role_claim")

        if path.startswith("/api/ops/") and role != "ops":
            raise HTTPException(status_code=403, detail="forbidden_ops_only")
        if path.startswith("/api/employee/") and role != "employee":
            raise HTTPException(status_code=403, detail="forbidden_employee_only")
    except HTTPException as exc:
        # Middleware must return a response directly; re-raising here becomes 500.
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    request.state.user = payload
    return await call_next(request)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/auth/login")
def login(payload: LoginRequest) -> dict:
    user = USERS.get(payload.username)
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="invalid_credentials")
    token = create_access_token({"sub": payload.username, "role": user["role"], "display_name": user["display_name"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"username": payload.username, "role": user["role"], "display_name": user["display_name"]},
    }


@app.get("/api/me")
def me(request: Request) -> dict:
    user = request.state.user
    return {"username": user["sub"], "role": user["role"], "display_name": user.get("display_name", "")}


@app.get("/api/exceptions")
def list_exceptions(request: Request) -> list[dict]:
    _sync_sla_flags()
    role = request.state.user["role"]
    return _list_exceptions_for_role(role)


@app.get("/api/exceptions/{exception_id}")
def get_exception(exception_id: str, request: Request) -> dict:
    item = _get_exception_for_role(exception_id, request.state.user["role"])
    _audit(exception_id, "view_detail", request.state.user["sub"], {"role": request.state.user["role"]})
    return item


@app.patch("/api/exceptions/{exception_id}")
def patch_exception(exception_id: str, payload: ExceptionPatchRequest, request: Request) -> dict:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, status, assignee, assigned_team, resolution_note, detected_at, severity, severity_hint, deadline_at, sla_breached
            FROM exceptions WHERE id = %s
            """,
            (exception_id,),
        )
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="exception_not_found")
        actor = request.state.user["sub"]
        role = request.state.user["role"]
        next_status = payload.status or existing["status"]
        if next_status not in ALLOWED_STATUSES:
            raise HTTPException(status_code=400, detail="invalid_status")

        # Employee can only progress own cases or request manager support.
        if role == "employee":
            if existing["assignee"] not in {None, actor}:
                raise HTTPException(status_code=403, detail="forbidden_not_assignee")
            if next_status not in {"in_progress", "waiting_manager_review", "resolved", "returned_to_ops"}:
                raise HTTPException(status_code=403, detail="forbidden_status_transition")

        resolved_at = datetime.now(timezone.utc) if next_status == "resolved" else None
        deadline_at = None
        if payload.status and payload.status == "returned_to_ops":
            severity = existing["severity"] or existing["severity_hint"] or "LOW"
            deadline_at = _calculate_deadline(existing["detected_at"], severity)

        cur.execute(
            """
            UPDATE exceptions
            SET
              status = COALESCE(%s::text, status),
              resolution_note = COALESCE(%s::text, resolution_note),
              assignee = COALESCE(%s::text, assignee),
              assigned_team = COALESCE(%s::text, assigned_team),
              assigned_at = CASE
                WHEN %s::text IS NOT NULL THEN NOW()
                ELSE assigned_at
              END,
              is_escalated = CASE
                WHEN COALESCE(%s::text, status) = 'waiting_manager_review' THEN TRUE
                ELSE is_escalated
              END,
              resolved_at = CASE
                WHEN %s::timestamptz IS NOT NULL THEN %s::timestamptz
                WHEN COALESCE(%s::text, status) <> 'resolved' THEN NULL
                ELSE resolved_at
              END,
              deadline_at = COALESCE(%s::timestamptz, deadline_at),
              sla_breached = CASE
                WHEN COALESCE(%s::timestamptz, deadline_at) IS NOT NULL AND COALESCE(%s::text, status) <> 'resolved'
                  THEN COALESCE(%s::timestamptz, deadline_at) < NOW()
                ELSE FALSE
              END
            WHERE id = %s
            """,
            (
                payload.status,
                payload.resolution_note,
                payload.assignee,
                payload.assigned_team,
                payload.assignee,
                payload.status,
                resolved_at,
                resolved_at,
                payload.status,
                deadline_at,
                deadline_at,
                payload.status,
                deadline_at,
                exception_id,
            ),
        )
        conn.commit()
    updated = _get_exception_for_role(exception_id, request.state.user["role"])
    _audit(
        exception_id,
        "updated_from_web",
        request.state.user["sub"],
        {
            "old": {
                "status": existing["status"],
                "assignee": existing["assignee"],
                "assigned_team": existing["assigned_team"],
                "resolution_note": existing["resolution_note"],
                "deadline_at": existing["deadline_at"].isoformat() if existing["deadline_at"] else None,
                "sla_breached": bool(existing["sla_breached"]),
            },
            "new": {
                "status": updated["status"],
                "assignee": updated.get("assignee"),
                "assigned_team": updated.get("assigned_team"),
                "resolution_note": updated.get("resolution_note"),
                "deadline_at": updated.get("deadline_at"),
                "sla_breached": bool(updated.get("sla_breached", False)),
            },
        },
    )
    return updated


@app.post("/api/exceptions/{exception_id}/escalate")
def escalate_exception(exception_id: str, request: Request) -> dict:
    # Backward compatible endpoint. In S7 wording this means "Yêu cầu quản lý hỗ trợ".
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT channels_sent, assignee, status, is_escalated FROM exceptions WHERE id = %s", (exception_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="exception_not_found")
        if request.state.user["role"] == "employee" and row["assignee"] not in {None, request.state.user["sub"]}:
            raise HTTPException(status_code=403, detail="forbidden_not_assignee")
        channels = set(row["channels_sent"] or [])
        channels.add("telegram_manager")
        cur.execute(
            """
            UPDATE exceptions
            SET
              is_escalated = TRUE,
              channels_sent = %s,
              status = 'waiting_manager_review'
            WHERE id = %s
            """,
            (sorted(channels), exception_id),
        )
        conn.commit()
    updated = _get_exception_for_role(exception_id, request.state.user["role"])
    _audit(
        exception_id,
        "requested_manager_support_from_web",
        request.state.user["sub"],
        {
            "old": {
                "status": row["status"],
                "is_escalated": bool(row["is_escalated"]),
                "channels_sent": row["channels_sent"] or [],
            },
            "new": {
                "status": updated["status"],
                "is_escalated": bool(updated.get("is_escalated")),
                "channels_sent": updated.get("channels_sent") or [],
            },
        },
    )
    return {"success": True}


@app.post("/api/exceptions/{exception_id}/claim")
def claim_exception(exception_id: str, request: Request) -> dict:
    actor = request.state.user["sub"]
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT assignee, assigned_team, status FROM exceptions WHERE id = %s", (exception_id,))
        before = cur.fetchone()
        if not before:
            raise HTTPException(status_code=404, detail="exception_not_found")
        cur.execute(
            """
            UPDATE exceptions
            SET assignee = %s,
                assigned_at = NOW(),
                status = CASE
                  WHEN status IN ('open', 'returned_to_ops', 'notified') THEN 'in_progress'
                  ELSE status
                END
            WHERE id = %s
            RETURNING id
            """,
            (actor, exception_id),
        )
        cur.fetchone()
        conn.commit()
    updated = _get_exception_for_role(exception_id, request.state.user["role"])
    _audit(
        exception_id,
        "claimed_from_web",
        actor,
        {
            "old": {
                "assignee": before["assignee"],
                "assigned_team": before["assigned_team"],
                "status": before["status"],
            },
            "new": {
                "assignee": updated.get("assignee"),
                "assigned_team": updated.get("assigned_team"),
                "status": updated["status"],
            },
        },
    )
    return updated


@app.post("/api/exceptions/{exception_id}/assign")
def assign_exception(exception_id: str, payload: AssignExceptionRequest, request: Request) -> dict:
    if request.state.user["role"] != "ops":
        raise HTTPException(status_code=403, detail="forbidden_ops_only")
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT assignee, assigned_team, status FROM exceptions WHERE id = %s", (exception_id,))
        before = cur.fetchone()
        if not before:
            raise HTTPException(status_code=404, detail="exception_not_found")
        cur.execute(
            """
            UPDATE exceptions
            SET assignee = %s,
                assigned_team = COALESCE(%s, assigned_team),
                assigned_at = NOW(),
                status = CASE
                  WHEN status IN ('open', 'returned_to_ops', 'notified') THEN 'in_progress'
                  ELSE status
                END
            WHERE id = %s
            RETURNING id
            """,
            (payload.assignee, payload.assigned_team, exception_id),
        )
        cur.fetchone()
        conn.commit()
    updated = _get_exception_for_role(exception_id, "ops")
    _audit(
        exception_id,
        "assigned_from_web",
        request.state.user["sub"],
        {
            "old": {
                "assignee": before["assignee"],
                "assigned_team": before["assigned_team"],
                "status": before["status"],
            },
            "new": {
                "assignee": updated.get("assignee"),
                "assigned_team": updated.get("assigned_team"),
                "status": updated["status"],
            },
        },
    )
    return updated


@app.get("/api/ops/exceptions")
def list_ops_exceptions(request: Request) -> list[dict]:
    if request.state.user["role"] != "ops":
        raise HTTPException(status_code=403, detail="forbidden_ops_only")
    return list_exceptions(request)


@app.get("/api/ops/exceptions/{exception_id}")
def get_ops_exception(exception_id: str, request: Request) -> dict:
    if request.state.user["role"] != "ops":
        raise HTTPException(status_code=403, detail="forbidden_ops_only")
    return get_exception(exception_id, request)


@app.patch("/api/ops/exceptions/{exception_id}")
def patch_ops_exception(exception_id: str, payload: ExceptionPatchRequest, request: Request) -> dict:
    if request.state.user["role"] != "ops":
        raise HTTPException(status_code=403, detail="forbidden_ops_only")
    return patch_exception(exception_id, payload, request)


@app.post("/api/ops/exceptions/{exception_id}/escalate")
def escalate_ops_exception(exception_id: str, request: Request) -> dict:
    if request.state.user["role"] != "ops":
        raise HTTPException(status_code=403, detail="forbidden_ops_only")
    return escalate_exception(exception_id, request)


@app.get("/api/employee/exceptions")
def list_employee_exceptions(request: Request) -> list[dict]:
    if request.state.user["role"] != "employee":
        raise HTTPException(status_code=403, detail="forbidden_employee_only")
    return list_exceptions(request)


@app.get("/api/employee/exceptions/{exception_id}")
def get_employee_exception(exception_id: str, request: Request) -> dict:
    if request.state.user["role"] != "employee":
        raise HTTPException(status_code=403, detail="forbidden_employee_only")
    return get_exception(exception_id, request)


@app.get("/api/audit-logs")
def list_audit_logs(request: Request, exception_id: str) -> list[dict]:
    if request.state.user["role"] != "ops":
        raise HTTPException(status_code=403, detail="forbidden_ops_only")
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, exception_id, action, actor, metadata, created_at
            FROM audit_logs
            WHERE exception_id = %s
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
