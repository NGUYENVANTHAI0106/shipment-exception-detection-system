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

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_API_URL = os.getenv("GEMINI_API_URL", "https://generativelanguage.googleapis.com/v1beta")
GEMINI_TIMEOUT_SECONDS = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "12"))


class ClassifyRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    exception_data: dict
    history_context: dict


def call_gemini_api(exception_data: dict, history: dict) -> str:
    # Test hook: allows deterministic AI-success validation without external network.
    mock_response = exception_data.get("_mock_gemini_response")
    if isinstance(mock_response, str) and mock_response.strip():
        return mock_response

    if not GEMINI_API_KEY:
        raise RuntimeError("missing_gemini_api_key")

    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"parts": [{"text": build_user_prompt(exception_data, history)}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 300,
        },
    }
    endpoint = f"{GEMINI_API_URL}/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=GEMINI_TIMEOUT_SECONDS) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"gemini_http_error:{exc.code}:{detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"gemini_network_error:{exc.reason}") from exc

    data = json.loads(raw)
    candidates = data.get("candidates", [])
    if not candidates:
        raise RuntimeError("gemini_empty_candidates")
    parts = candidates[0].get("content", {}).get("parts", [])
    if not parts:
        raise RuntimeError("gemini_empty_content")
    return (parts[0].get("text") or "").strip()


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
        call_claude_api=call_gemini_api,
        model_name=GEMINI_MODEL,
    )
    classified["classified_at"] = datetime.now(timezone.utc).isoformat()
    return classified
