from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import asc, desc, select
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
    type: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    sort_by: str = Query(default="detected_at"),
    sort_dir: str = Query(default="desc"),
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
    )
    if type:
        stmt = stmt.where(ExceptionRecord.type == type)
    if severity:
        stmt = stmt.where(ExceptionRecord.severity == severity)
    if status:
        stmt = stmt.where(ExceptionRecord.status == status)

    sort_map = {
        "detected_at": ExceptionRecord.detected_at,
        "severity": ExceptionRecord.severity,
        "type": ExceptionRecord.type,
        "status": ExceptionRecord.status,
        "id": ExceptionRecord.id,
    }
    sort_col = sort_map.get(sort_by, ExceptionRecord.detected_at)
    order_fn = desc if sort_dir.lower() != "asc" else asc
    stmt = stmt.order_by(order_fn(sort_col)).limit(limit).offset(offset)
    rows = db.execute(stmt).scalars().all()
    return [_to_response(r) for r in rows]


@router.get("/{exception_id}", response_model=ExceptionResponse)
def get_exception(
    exception_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ExceptionResponse:
    stmt = (
        select(ExceptionRecord)
        .join(Shipment, Shipment.id == ExceptionRecord.shipment_id)
        .where(ExceptionRecord.id == exception_id, Shipment.user_id == user.id)
    )
    e = db.execute(stmt).scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Exception not found")
    return _to_response(e)


@router.post("/", response_model=ExceptionResponse, status_code=201)
def create_exception(
    shipment_id: int,
    type: str,
    severity: str = "medium",
    description: str = "",
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> ExceptionResponse:
    """
    Manual exception create (admin): dùng khi cần tạo exception thủ công để demo/ops.
    """
    s = db.execute(select(Shipment).where(Shipment.id == shipment_id)).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")

    if not description:
        description = f"Manual exception '{type}' created by admin."

    e = ExceptionRecord(
        shipment_id=s.id,
        type=type,
        severity=severity,
        description=description,
        status="open",
        auto_detected=False,
        detected_at=datetime.now(timezone.utc),
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return _to_response(e)


@router.delete("/{exception_id}", response_class=Response, status_code=204)
def delete_exception(
    exception_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Response:
    e = db.execute(select(ExceptionRecord).where(ExceptionRecord.id == exception_id)).scalar_one_or_none()
    if not e:
        return Response(status_code=204)
    db.delete(e)
    db.commit()
    return Response(status_code=204)


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

