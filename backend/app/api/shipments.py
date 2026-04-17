from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import asc, desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models.shipment import Shipment
from app.models.user import User
from app.schemas.shipment import ShipmentCreate, ShipmentResponse, ShipmentUpdate
from app.services.detection_engine import detect_for_shipment, persist_detected


router = APIRouter(prefix="/api/shipments", tags=["shipments"])


def _to_response(s: Shipment) -> ShipmentResponse:
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


@router.get("/", response_model=list[ShipmentResponse])
def list_shipments(
    q: str | None = None,
    status: str | None = None,
    carrier: str | None = None,
    sort_by: str = Query(default="created_at"),
    sort_dir: str = Query(default="desc"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ShipmentResponse]:
    stmt = select(Shipment).where(Shipment.user_id == user.id)
    if q:
        stmt = stmt.where(Shipment.tracking_number.ilike(f"%{q}%"))
    if status:
        stmt = stmt.where(Shipment.status == status)
    if carrier:
        stmt = stmt.where(Shipment.carrier == carrier)

    sort_map = {
        "created_at": Shipment.created_at,
        "updated_at": Shipment.updated_at,
        "estimated_delivery": Shipment.estimated_delivery,
        "tracking_number": Shipment.tracking_number,
        "carrier": Shipment.carrier,
        "status": Shipment.status,
    }
    sort_col = sort_map.get(sort_by, Shipment.created_at)
    order_fn = desc if sort_dir.lower() != "asc" else asc
    stmt = stmt.order_by(order_fn(sort_col))

    shipments = db.execute(stmt.limit(limit).offset(offset)).scalars().all()
    return [_to_response(s) for s in shipments]


@router.get("/{shipment_id}", response_model=ShipmentResponse)
def get_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ShipmentResponse:
    s = db.execute(select(Shipment).where(Shipment.id == shipment_id, Shipment.user_id == user.id)).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return _to_response(s)


@router.post("/", response_model=ShipmentResponse, status_code=201)
def create_shipment(
    payload: ShipmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ShipmentResponse:
    s = Shipment(user_id=user.id, **payload.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)

    created_exc = persist_detected(db, s, detect_for_shipment(db, s))
    if created_exc:
        db.commit()

    return _to_response(s)


@router.patch("/{shipment_id}", response_model=ShipmentResponse)
def update_shipment(
    shipment_id: int,
    payload: ShipmentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ShipmentResponse:
    s = db.execute(select(Shipment).where(Shipment.id == shipment_id, Shipment.user_id == user.id)).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    s.updated_at = datetime.now(timezone.utc)
    db.add(s)
    db.commit()
    db.refresh(s)

    created_exc = persist_detected(db, s, detect_for_shipment(db, s))
    if created_exc:
        db.commit()
    return _to_response(s)


@router.delete("/{shipment_id}", response_class=Response, status_code=204)
def delete_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    s = db.execute(select(Shipment).where(Shipment.id == shipment_id, Shipment.user_id == user.id)).scalar_one_or_none()
    if not s:
        return Response(status_code=204)
    db.delete(s)
    db.commit()
    return Response(status_code=204)


@router.post("/ingest", status_code=202)
def ingest(
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    """
    N8N/webhook entrypoint: nhận raw payload và upsert shipment theo tracking_number+carrier.
    v1: đơn giản hoá, tạo mới nếu chưa có.
    """
    tracking_number = str(payload.get("tracking_number") or payload.get("trackingNumber") or "").strip()
    carrier = str(payload.get("carrier") or "").strip()
    if not tracking_number or not carrier:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="tracking_number & carrier required")

    stmt = select(Shipment).where(Shipment.tracking_number == tracking_number, Shipment.carrier == carrier)
    s = db.execute(stmt).scalar_one_or_none()
    if not s:
        s = Shipment(
            user_id=admin.id,
            tracking_number=tracking_number,
            carrier=carrier,
            status=str(payload.get("status") or "in_transit"),
            raw_data=payload,
        )
    else:
        s.status = str(payload.get("status") or s.status)
        s.current_location = payload.get("current_location") or payload.get("currentLocation") or s.current_location
        s.raw_data = payload

    db.add(s)
    db.commit()
    db.refresh(s)

    created_exc = persist_detected(db, s, detect_for_shipment(db, s))
    if created_exc:
        db.commit()

    return {"ok": True, "shipment_id": s.id, "exceptions_created": len(created_exc)}

