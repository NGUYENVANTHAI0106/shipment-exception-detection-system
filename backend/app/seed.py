from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.rule import DetectionRule
from app.models.shipment import Shipment
from app.models.user import User
from app.services.security import hash_password


def seed(db: Session) -> None:
    # Admin user
    admin_email = "admin@local.test"
    admin = db.execute(select(User).where(User.email == admin_email)).scalar_one_or_none()
    if not admin:
        admin = User(email=admin_email, password_hash=hash_password("Admin123!"), role="admin", company_name="Internal")
        db.add(admin)
        db.commit()
        db.refresh(admin)

    # Client user
    client_email = "client@local.test"
    client = db.execute(select(User).where(User.email == client_email)).scalar_one_or_none()
    if not client:
        client = User(email=client_email, password_hash=hash_password("Client123!"), role="client", company_name="Demo Co")
        db.add(client)
        db.commit()
        db.refresh(client)

    # Rule
    rule_name = "Flag delivered-but-status-exception"
    rule = db.execute(select(DetectionRule).where(DetectionRule.name == rule_name)).scalar_one_or_none()
    if not rule:
        rule = DetectionRule(
            name=rule_name,
            type="custom",
            conditions={"status_in": ["exception", "damaged"]},
            severity="high",
            is_active=True,
            created_by=admin.id,
        )
        db.add(rule)
        db.commit()

    # Shipments
    now = datetime.now(timezone.utc)
    demo = [
        ("VN123456789", "DHL", "HCMC", "Hanoi", "in_transit", now - timedelta(days=2), None),
        ("VN000000001", "FedEx", "HCMC", "Da Nang", "in_transit", now - timedelta(days=10), now - timedelta(days=10)),
        ("VN999999999", "DHL", "HCMC", "Hue", "exception", now + timedelta(days=1), now - timedelta(days=1)),
    ]

    for tn, carrier, origin, dest, status, updated_at, eta in demo:
        s = db.execute(
            select(Shipment).where(Shipment.tracking_number == tn, Shipment.carrier == carrier, Shipment.user_id == client.id)
        ).scalar_one_or_none()
        if s:
            continue
        s = Shipment(
            user_id=client.id,
            tracking_number=tn,
            carrier=carrier,
            origin=origin,
            destination=dest,
            status=status,
            estimated_delivery=eta,
            raw_data={"seed": True},
        )
        s.updated_at = updated_at
        db.add(s)

    db.commit()

