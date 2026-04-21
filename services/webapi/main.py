from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

Role = Literal["ops", "employee"]

JWT_SECRET = os.getenv("APP_JWT_SECRET", "dev-secret-change-me")
ACCESS_TTL_SECONDS = int(os.getenv("APP_ACCESS_TOKEN_EXPIRE_MINUTES", "480")) * 60

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

EXCEPTIONS: list[dict] = [
    {
        "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
        "shipment_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
        "tracking_number": "TRK-GH2604001",
        "carrier": "GHN",
        "origin": "Hà Nội",
        "destination": "TP. Hồ Chí Minh",
        "exception_type": "delay",
        "severity": "CRITICAL",
        "reason": "Trễ hạn 36 giờ",
        "overdue_hours": 36,
        "ai_suggestion": "Liên hệ kho trung chuyển Đà Nẵng và xác nhận ETA trong 1 giờ.",
        "confidence": 0.92,
        "status": "open",
        "detected_at": "2026-04-20T01:30:00.000Z",
        "channels_sent": ["telegram_ops"],
        "is_escalated": False,
        "resolution_note": "",
    },
    {
        "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "shipment_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "tracking_number": "TRK-TEST-S4",
        "carrier": "GHTK",
        "origin": "Hà Nội",
        "destination": "Đà Nẵng",
        "exception_type": "failed_delivery",
        "severity": "HIGH",
        "reason": "Giao thất bại sau 2 lần",
        "overdue_hours": 18,
        "ai_suggestion": "Gọi người nhận xác nhận lại thời gian nhận hàng.",
        "confidence": 0.81,
        "status": "in_progress",
        "detected_at": "2026-04-20T03:30:00.000Z",
        "channels_sent": ["telegram_ops", "email"],
        "is_escalated": False,
        "resolution_note": "Đã gọi khách, chờ xác nhận.",
    },
]

AUDIT_LOGS: list[dict] = []


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


@app.get("/api/ops/exceptions")
def list_ops_exceptions() -> list[dict]:
    return EXCEPTIONS


@app.get("/api/ops/exceptions/{exception_id}")
def get_ops_exception(exception_id: str) -> dict:
    item = next((x for x in EXCEPTIONS if x["id"] == exception_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="exception_not_found")
    return item


@app.patch("/api/ops/exceptions/{exception_id}")
def patch_ops_exception(exception_id: str, payload: ExceptionPatchRequest, request: Request) -> dict:
    item = next((x for x in EXCEPTIONS if x["id"] == exception_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="exception_not_found")
    if payload.status is not None:
        item["status"] = payload.status
    if payload.resolution_note is not None:
        item["resolution_note"] = payload.resolution_note
    AUDIT_LOGS.append(
        {
            "id": str(uuid4()),
            "exception_id": exception_id,
            "action": "updated_from_web",
            "actor": request.state.user["sub"],
            "metadata": {"status": payload.status, "resolution_note": payload.resolution_note},
        }
    )
    return item


@app.post("/api/ops/exceptions/{exception_id}/escalate")
def escalate_ops_exception(exception_id: str, request: Request) -> dict:
    item = next((x for x in EXCEPTIONS if x["id"] == exception_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="exception_not_found")
    item["is_escalated"] = True
    channels = set(item.get("channels_sent") or [])
    channels.add("telegram_manager")
    item["channels_sent"] = sorted(channels)
    AUDIT_LOGS.append(
        {
            "id": str(uuid4()),
            "exception_id": exception_id,
            "action": "manual_escalate_from_web",
            "actor": request.state.user["sub"],
            "metadata": {"channels_sent": item["channels_sent"]},
        }
    )
    return {"success": True}


@app.get("/api/employee/exceptions")
def list_employee_exceptions(request: Request) -> list[dict]:
    user = request.state.user
    # Scope simplification: employee can see non-critical items only.
    if user["role"] != "employee":
        raise HTTPException(status_code=403, detail="forbidden_employee_only")
    return [x for x in EXCEPTIONS if x["severity"] != "CRITICAL"]


@app.get("/api/employee/exceptions/{exception_id}")
def get_employee_exception(exception_id: str) -> dict:
    item = next((x for x in EXCEPTIONS if x["id"] == exception_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="exception_not_found")
    if item["severity"] == "CRITICAL":
        raise HTTPException(status_code=403, detail="forbidden_critical_for_employee")
    return item
