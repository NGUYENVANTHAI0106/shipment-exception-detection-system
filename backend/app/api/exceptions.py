from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models.exception import ExceptionRecord
from app.models.shipment import Shipment
from app.models.user import User
from app.schemas.exception import ExceptionResponse, ExceptionUpdate


router = APIRouter(prefix="/api/exceptions", tags=["exceptions"])


def _to_response(e: ExceptionRecord) -> ExceptionResponse:
    return ExceptionResponse(
        id=e.id,
        shipment_id=e.shipment_id,
        type=e.type,
        severity=e.severity,
        description=e.description,
        detected_at=e.detected_at,
        resolved_at=e.resolved_at,
        resolved_by=e.resolved_by,
        status=e.status,
        auto_detected=e.auto_detected,
    )


@router.get("/", response_model=list[ExceptionResponse])
def list_exceptions(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ExceptionResponse]:
    # only exceptions on user's shipments
    stmt = (
        select(ExceptionRecord)
        .join(Shipment, Shipment.id == ExceptionRecord.shipment_id)
        .where(Shipment.user_id == user.id)
        .order_by(desc(ExceptionRecord.detected_at))
        .limit(limit)
        .offset(offset)
    )
    rows = db.execute(stmt).scalars().all()
    return [_to_response(r) for r in rows]


@router.patch("/{exception_id}", response_model=ExceptionResponse)
def update_exception(
    exception_id: int,
    payload: ExceptionUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> ExceptionResponse:
    e = db.execute(select(ExceptionRecord).where(ExceptionRecord.id == exception_id)).scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Exception not found")

    if payload.status:
        e.status = payload.status
        if payload.status in {"resolved", "dismissed"}:
            e.resolved_at = datetime.now(timezone.utc)
            e.resolved_by = admin.id
        else:
            e.resolved_at = None
            e.resolved_by = None

    db.add(e)
    db.commit()
    db.refresh(e)
    return _to_response(e)

