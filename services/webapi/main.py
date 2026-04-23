from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
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


USERS = {
    "ops": {"password": "ops123", "role": "ops", "display_name": "Ops User"},
    "employee": {"password": "employee123", "role": "employee", "display_name": "Nhân viên"},
}

def _connect():
    return psycopg.connect(DB_DSN, row_factory=dict_row)


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
              e.resolution_note
            FROM exceptions e
            JOIN shipments s ON s.id = e.shipment_id
            {where_clause}
            ORDER BY e.detected_at DESC
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
              e.resolution_note
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
    role = request.state.user["role"]
    return _list_exceptions_for_role(role)


@app.get("/api/exceptions/{exception_id}")
def get_exception(exception_id: str, request: Request) -> dict:
    item = _get_exception_for_role(exception_id, request.state.user["role"])
    _audit(exception_id, "view_detail", request.state.user["sub"], {"role": request.state.user["role"]})
    return item


@app.patch("/api/exceptions/{exception_id}")
def patch_exception(exception_id: str, payload: ExceptionPatchRequest, request: Request) -> dict:
    if request.state.user["role"] != "ops":
        raise HTTPException(status_code=403, detail="forbidden_ops_only")
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT id FROM exceptions WHERE id = %s", (exception_id,))
        existing = cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="exception_not_found")
        cur.execute(
            """
            UPDATE exceptions
            SET
              status = COALESCE(%s, status),
              resolution_note = COALESCE(%s, resolution_note)
            WHERE id = %s
            """,
            (payload.status, payload.resolution_note, exception_id),
        )
        conn.commit()
    _audit(
        exception_id,
        "updated_from_web",
        request.state.user["sub"],
        {"status": payload.status, "resolution_note": payload.resolution_note},
    )
    return _get_exception_for_role(exception_id, "ops")


@app.post("/api/exceptions/{exception_id}/escalate")
def escalate_exception(exception_id: str, request: Request) -> dict:
    if request.state.user["role"] != "ops":
        raise HTTPException(status_code=403, detail="forbidden_ops_only")
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT channels_sent FROM exceptions WHERE id = %s", (exception_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="exception_not_found")
        channels = set(row["channels_sent"] or [])
        channels.add("telegram_manager")
        cur.execute(
            """
            UPDATE exceptions
            SET is_escalated = TRUE, channels_sent = %s
            WHERE id = %s
            """,
            (sorted(channels), exception_id),
        )
        conn.commit()
    _audit(
        exception_id,
        "manual_escalate_from_web",
        request.state.user["sub"],
        {"channels_sent": sorted(channels)},
    )
    return {"success": True}


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
