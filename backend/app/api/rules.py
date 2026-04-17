from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import asc, desc, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database import get_db
from app.models.rule import DetectionRule
from app.models.user import User
from app.schemas.rule import RuleCreate, RuleResponse, RuleUpdate


router = APIRouter(prefix="/api/rules", tags=["rules"])


def _to_response(r: DetectionRule) -> RuleResponse:
    return RuleResponse(
        id=r.id,
        name=r.name,
        type=r.type,
        conditions=r.conditions,
        severity=r.severity,
        is_active=r.is_active,
        created_by=r.created_by,
        created_at=r.created_at,
    )


@router.get("/", response_model=list[RuleResponse])
def list_rules(
    q: str | None = None,
    type: str | None = None,
    severity: str | None = None,
    is_active: bool | None = None,
    sort_by: str = Query(default="created_at"),
    sort_dir: str = Query(default="desc"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[RuleResponse]:
    stmt = select(DetectionRule)
    if q:
        stmt = stmt.where(DetectionRule.name.ilike(f"%{q}%"))
    if type:
        stmt = stmt.where(DetectionRule.type == type)
    if severity:
        stmt = stmt.where(DetectionRule.severity == severity)
    if is_active is not None:
        stmt = stmt.where(DetectionRule.is_active.is_(is_active))

    sort_map = {
        "created_at": DetectionRule.created_at,
        "name": DetectionRule.name,
        "type": DetectionRule.type,
        "severity": DetectionRule.severity,
        "is_active": DetectionRule.is_active,
        "id": DetectionRule.id,
    }
    sort_col = sort_map.get(sort_by, DetectionRule.created_at)
    order_fn = desc if sort_dir.lower() != "asc" else asc
    stmt = stmt.order_by(order_fn(sort_col)).limit(limit).offset(offset)

    rows = db.execute(stmt).scalars().all()
    return [_to_response(r) for r in rows]


@router.post("/", response_model=RuleResponse, status_code=201)
def create_rule(payload: RuleCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> RuleResponse:
    r = DetectionRule(
        name=payload.name,
        type=payload.type,
        conditions=payload.conditions,
        severity=payload.severity,
        is_active=payload.is_active,
        created_by=admin.id,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _to_response(r)


@router.patch("/{rule_id}", response_model=RuleResponse)
def update_rule(rule_id: int, payload: RuleUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> RuleResponse:
    r = db.execute(select(DetectionRule).where(DetectionRule.id == rule_id)).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Rule not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    db.add(r)
    db.commit()
    db.refresh(r)
    return _to_response(r)


@router.delete("/{rule_id}", response_class=Response, status_code=204)
def delete_rule(rule_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> Response:
    r = db.execute(select(DetectionRule).where(DetectionRule.id == rule_id)).scalar_one_or_none()
    if not r:
        return Response(status_code=204)
    db.delete(r)
    db.commit()
    return Response(status_code=204)

