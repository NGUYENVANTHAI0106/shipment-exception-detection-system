from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import desc, select
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
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[RuleResponse]:
    rows = db.execute(select(DetectionRule).order_by(desc(DetectionRule.created_at)).limit(limit).offset(offset)).scalars().all()
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

