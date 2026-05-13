from __future__ import annotations

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

from services.classifier.core import classify_by_rules

app = FastAPI(title="classifier-service", version="0.2.0")


class ClassifyRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    exception_data: dict
    history_context: dict


@app.post("/classify")
def classify(payload: ClassifyRequest) -> dict:
    exception_data = payload.exception_data
    required = {"exception_type", "reason", "severity_hint", "overdue_hours"}
    missing = [key for key in required if key not in exception_data]
    if missing:
        raise HTTPException(status_code=400, detail=f"missing_fields:{','.join(missing)}")

    classified = classify_by_rules(exception_data)
    classified["classified_at"] = datetime.now(timezone.utc).isoformat()
    return classified
