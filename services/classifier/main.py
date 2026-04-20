from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone

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

from services.classifier.core import SYSTEM_PROMPT, build_user_prompt, classify_with_fallback

app = FastAPI(title="classifier-service", version="0.1.0")

CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
CLAUDE_API_URL = os.getenv("CLAUDE_API_URL", "https://api.anthropic.com/v1/messages")
CLAUDE_TIMEOUT_SECONDS = int(os.getenv("CLAUDE_TIMEOUT_SECONDS", "12"))


class ClassifyRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    exception_data: dict
    history_context: dict


def call_claude_api(exception_data: dict, history: dict) -> str:
    if not CLAUDE_API_KEY:
        raise RuntimeError("missing_claude_api_key")

    payload = {
        "model": CLAUDE_MODEL,
        "max_tokens": 300,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": build_user_prompt(exception_data, history)}],
    }
    request = urllib.request.Request(
        CLAUDE_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "x-api-key": CLAUDE_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=CLAUDE_TIMEOUT_SECONDS) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"claude_http_error:{exc.code}:{detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"claude_network_error:{exc.reason}") from exc

    data = json.loads(raw)
    contents = data.get("content", [])
    text_blocks = [item.get("text", "") for item in contents if item.get("type") == "text"]
    if not text_blocks:
        raise RuntimeError("claude_empty_content")
    return text_blocks[0].strip()


@app.post("/classify")
def classify(payload: ClassifyRequest) -> dict:
    exception_data = payload.exception_data
    history_context = payload.history_context
    required = {"exception_type", "reason", "severity_hint", "overdue_hours"}
    missing = [key for key in required if key not in exception_data]
    if missing:
        raise HTTPException(status_code=400, detail=f"missing_fields:{','.join(missing)}")

    classified = classify_with_fallback(
        exception_data=exception_data,
        history=history_context,
        call_claude_api=call_claude_api,
        model_name=CLAUDE_MODEL,
    )
    classified["classified_at"] = datetime.now(timezone.utc).isoformat()
    return classified
