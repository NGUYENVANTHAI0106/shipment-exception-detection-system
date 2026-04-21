from __future__ import annotations

import json
import os
import smtplib
import urllib.parse
import urllib.request
from email.mime.text import MIMEText

try:
    from fastapi import FastAPI, HTTPException
except ModuleNotFoundError:  # pragma: no cover
    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str) -> None:
            self.status_code = status_code
            self.detail = detail
            super().__init__(detail)

    class FastAPI:  # type: ignore[override]
        def __init__(self, *args, **kwargs) -> None:
            pass

        def post(self, *_args, **_kwargs):
            def decorator(func):
                return func

            return decorator

        def get(self, *_args, **_kwargs):
            def decorator(func):
                return func

            return decorator

try:
    from pydantic import BaseModel, ConfigDict
except ModuleNotFoundError:  # pragma: no cover
    class BaseModel:  # type: ignore[override]
        def __init__(self, **kwargs) -> None:
            for key, value in kwargs.items():
                setattr(self, key, value)

        def model_dump(self) -> dict:
            return self.__dict__

    ConfigDict = dict  # type: ignore[misc,assignment]

from services.notifier.core import (
    apply_sla_escalation,
    build_manager_escalation_message,
    build_ops_message,
    route_channels,
)

app = FastAPI(title="notifier-service", version="0.1.0")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_OPS_CHAT_ID = os.getenv("TELEGRAM_OPS_CHAT_ID", "")
TELEGRAM_MANAGER_CHAT_ID = os.getenv("TELEGRAM_MANAGER_CHAT_ID", "")

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_OPS_RECIPIENT = os.getenv("EMAIL_OPS_RECIPIENT", "")
EMAIL_MANAGER_RECIPIENT = os.getenv("EMAIL_MANAGER_RECIPIENT", "")


class NotifyRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    exception_id: str
    severity: str
    exception_type: str
    overdue_hours: float = 0
    reason: str = ""
    ai_suggestion: str = ""
    carrier: str = "unknown"
    is_already_notified: bool = False


class EscalateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    exception_id: str
    severity: str
    overdue_hours: float = 0
    reason: str = ""
    carrier: str = "unknown"


def _send_telegram(chat_id: str, message: str) -> str:
    if not TELEGRAM_BOT_TOKEN:
        raise RuntimeError("missing_telegram_bot_token")
    if not chat_id:
        raise RuntimeError("missing_telegram_chat_id")

    payload = urllib.parse.urlencode(
        {"chat_id": chat_id, "text": message, "parse_mode": "Markdown"}
    ).encode("utf-8")
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    request = urllib.request.Request(url, data=payload, method="POST")
    with urllib.request.urlopen(request, timeout=10) as response:
        body = json.loads(response.read().decode("utf-8"))
    if not body.get("ok"):
        raise RuntimeError(f"telegram_send_failed:{body}")
    return str(body["result"]["message_id"])


def _send_email(to_address: str, subject: str, body: str) -> str:
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD):
        raise RuntimeError("missing_smtp_config")
    if not to_address:
        raise RuntimeError("missing_email_recipient")

    message = MIMEText(body, "plain", "utf-8")
    message["Subject"] = subject
    message["From"] = SMTP_USER
    message["To"] = to_address
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
        smtp.starttls()
        smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.sendmail(SMTP_USER, [to_address], message.as_string())
    return to_address


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/notify")
def notify(payload: NotifyRequest) -> dict:
    if payload.is_already_notified:
        return {
            "success": True,
            "exception_id": payload.exception_id,
            "channels_sent": [],
            "telegram_message_id": None,
            "email_sent_to": [],
            "is_escalated": False,
            "skipped_reason": "already_notified",
        }

    normalized = apply_sla_escalation(payload.model_dump())
    decision = route_channels(
        severity=normalized["severity"],
        overdue_hours=float(normalized.get("overdue_hours", 0)),
    )

    channels_sent: list[str] = []
    email_sent_to: list[str] = []
    telegram_message_id: str | None = None

    if "telegram_ops" in decision.channels:
        try:
            telegram_message_id = _send_telegram(
                TELEGRAM_OPS_CHAT_ID, build_ops_message(normalized)
            )
            channels_sent.append("telegram_ops")
        except Exception:  # noqa: BLE001
            # Phase 1 requirement: if Telegram fails, keep email route alive.
            pass

    if "telegram_manager" in decision.channels:
        try:
            _send_telegram(TELEGRAM_MANAGER_CHAT_ID, build_manager_escalation_message(normalized))
            channels_sent.append("telegram_manager")
        except Exception:  # noqa: BLE001
            pass

    if "email" in decision.channels:
        recipients = [EMAIL_OPS_RECIPIENT]
        if decision.is_escalated and EMAIL_MANAGER_RECIPIENT:
            recipients.append(EMAIL_MANAGER_RECIPIENT)
        for recipient in [r for r in recipients if r]:
            try:
                email_sent_to.append(
                    _send_email(
                        recipient,
                        f"[{normalized['severity']}] Shipment exception {payload.exception_id}",
                        f"Reason: {normalized.get('reason', '')}\nAction: {normalized.get('ai_suggestion', '')}",
                    )
                )
            except Exception:  # noqa: BLE001
                continue
        if email_sent_to:
            channels_sent.append("email")

    return {
        "success": True,
        "exception_id": payload.exception_id,
        "channels_sent": channels_sent,
        "telegram_message_id": telegram_message_id,
        "email_sent_to": email_sent_to,
        "is_escalated": decision.is_escalated,
        "skipped_reason": None,
    }


@app.post("/escalate")
def escalate(payload: EscalateRequest) -> dict:
    data = payload.model_dump()
    data["severity"] = "CRITICAL"
    message = build_manager_escalation_message(data)
    try:
        message_id = _send_telegram(TELEGRAM_MANAGER_CHAT_ID, message)
        channels = ["telegram_manager"]
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"escalate_failed:{exc}") from exc
    return {
        "success": True,
        "exception_id": payload.exception_id,
        "channels_sent": channels,
        "telegram_message_id": message_id,
        "is_escalated": True,
    }
