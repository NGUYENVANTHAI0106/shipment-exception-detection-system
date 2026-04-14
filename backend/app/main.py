from __future__ import annotations

from fastapi import FastAPI
from sqlalchemy.orm import Session

from app.api import auth, exceptions, rules, shipments
from app.config import settings
from app.database import SessionLocal
from app.seed import seed


app = FastAPI(
    title="Shipment Exception Detection API",
    version="0.1.0",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.include_router(auth.router)
app.include_router(shipments.router)
app.include_router(exceptions.router)
app.include_router(rules.router)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "env": settings.env}


@app.on_event("startup")
def on_startup() -> None:
    if not settings.seed_on_startup:
        return
    db: Session = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()

