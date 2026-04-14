from __future__ import annotations

from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database import get_db
from app.models.exception import ExceptionRecord
from app.models.shipment import Shipment
from app.models.user import User
from app.schemas.exception import ExceptionResponse
from app.schemas.shipment import ShipmentResponse
from app.schemas.user import AdminUserResponse, AdminUserUpdate


router = APIRouter(prefix="/api/admin", tags=["admin"])


def _shipment_to_response(s: Shipment) -> ShipmentResponse:
    return ShipmentResponse(
        id=s.id,
        user_id=s.user_id,
        tracking_number=s.tracking_number,
        carrier=s.carrier,
        origin=s.origin,
        destination=s.destination,
        status=s.status,
        current_location=s.current_location,
        estimated_delivery=s.estimated_delivery,
        actual_delivery=s.actual_delivery,
        weight=s.weight,
        raw_data=s.raw_data,
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


def _exception_to_response(e: ExceptionRecord) -> ExceptionResponse:
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


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[AdminUserResponse]:
    rows = db.execute(select(User).order_by(desc(User.created_at)).limit(limit).offset(offset)).scalars().all()
    return [
        AdminUserResponse(
            id=u.id,
            email=u.email,
            role=u.role,
            company_name=u.company_name,
            created_at=u.created_at,
        )
        for u in rows
    ]


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AdminUserResponse:
    u = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.role is not None:
        if payload.role not in {"client", "admin"}:
            raise HTTPException(status_code=422, detail="role must be 'client' or 'admin'")
        u.role = payload.role
    if payload.company_name is not None:
        u.company_name = payload.company_name

    db.add(u)
    db.commit()
    db.refresh(u)
    return AdminUserResponse(id=u.id, email=u.email, role=u.role, company_name=u.company_name, created_at=u.created_at)


@router.get("/shipments", response_model=list[ShipmentResponse])
def list_all_shipments(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[ShipmentResponse]:
    rows = db.execute(select(Shipment).order_by(desc(Shipment.created_at)).limit(limit).offset(offset)).scalars().all()
    return [_shipment_to_response(s) for s in rows]


@router.get("/exceptions", response_model=list[ExceptionResponse])
def list_all_exceptions(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[ExceptionResponse]:
    rows = (
        db.execute(select(ExceptionRecord).order_by(desc(ExceptionRecord.detected_at)).limit(limit).offset(offset))
        .scalars()
        .all()
    )
    return [_exception_to_response(e) for e in rows]


@router.get("/summary")
def summary(db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> dict:
    total_shipments = db.execute(select(func.count()).select_from(Shipment)).scalar_one()
    total_exceptions = db.execute(select(func.count()).select_from(ExceptionRecord)).scalar_one()
    open_exceptions = db.execute(
        select(func.count()).select_from(ExceptionRecord).where(ExceptionRecord.status.in_(["open", "investigating"]))
    ).scalar_one()

    type_counts = db.execute(select(ExceptionRecord.type)).scalars().all()
    severity_counts = db.execute(select(ExceptionRecord.severity)).scalars().all()

    return {
        "total_shipments": int(total_shipments or 0),
        "total_exceptions": int(total_exceptions or 0),
        "open_exceptions": int(open_exceptions or 0),
        "exceptions_by_type": dict(Counter(type_counts)),
        "exceptions_by_severity": dict(Counter(severity_counts)),
    }

