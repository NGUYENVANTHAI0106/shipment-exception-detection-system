from __future__ import annotations

from datetime import datetime, timedelta, timezone
from random import Random

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.rule import DetectionRule
from app.models.shipment import Shipment
from app.models.user import User
from app.services.detection_engine import detect_for_shipment, persist_detected
from app.services.security import hash_password


def seed(db: Session) -> None:
    now = datetime.now(timezone.utc)

    # --- Users (2 users) ---
    admin_email = "admin@local.test"
    admin = db.execute(select(User).where(User.email == admin_email)).scalar_one_or_none()
    if not admin:
        admin = User(email=admin_email, password_hash=hash_password("Admin123!"), role="admin", company_name="Internal")
        db.add(admin)
        db.commit()
        db.refresh(admin)

    client_email = "client@local.test"
    client = db.execute(select(User).where(User.email == client_email)).scalar_one_or_none()
    if not client:
        client = User(email=client_email, password_hash=hash_password("Client123!"), role="client", company_name="Demo Co")
        db.add(client)
        db.commit()
        db.refresh(client)

    # --- Rules (>= 5 rules) ---
    rules_spec = [
        # delay rule
        (
            "Delay > 48h (any carrier)",
            "delay",
            {"delay_hours_gt": 48, "condition_operator": "AND"},
            "high",
        ),
        # express stale/lost rule
        (
            "Express stale > 3 days",
            "lost",
            {"service_level_in": ["express", "priority"], "stale_days_gt": 3, "condition_operator": "AND"},
            "high",
        ),
        # standard stale/lost rule -> critical
        (
            "Any stale > 14 days (critical)",
            "lost",
            {"stale_days_gt": 14, "condition_operator": "AND"},
            "critical",
        ),
        # carrier/status combination
        (
            "DHL exception statuses",
            "custom",
            {"carrier_in": ["dhl"], "status_in": ["exception", "damaged", "held"], "condition_operator": "AND"},
            "high",
        ),
        # destination-based
        (
            "Customs risk: destination SG/HK",
            "customs",
            {"destination_in": ["singapore", "hong kong"], "condition_operator": "AND"},
            "medium",
        ),
    ]

    existing_rules = {r.name for r in db.execute(select(DetectionRule)).scalars().all()}
    for name, rtype, cond, sev in rules_spec:
        if name in existing_rules:
            continue
        db.add(
            DetectionRule(
                name=name,
                type=rtype,
                conditions=cond,
                severity=sev,
                is_active=True,
                created_by=admin.id,
            )
        )
    db.commit()

    # --- Shipments (>= 30 shipments) ---
    rng = Random(20260417)
    carriers = ["DHL", "FedEx", "UPS", "GHN", "GHTK"]
    origins = ["HCMC", "Hanoi", "Da Nang", "Hai Phong"]
    destinations = ["Hanoi", "Da Nang", "Hue", "Singapore", "Bangkok", "Hong Kong"]
    statuses = ["created", "picked_up", "in_transit", "out_for_delivery", "exception"]
    service_levels = ["standard", "express", "priority"]

    def upsert_seed_shipment(
        *,
        tn: str,
        carrier: str,
        origin: str,
        destination: str,
        status: str,
        estimated_delivery: datetime | None,
        last_event_at: datetime,
        service_level: str,
        keywords: list[str] | None = None,
    ) -> Shipment:
        s = db.execute(
            select(Shipment).where(Shipment.tracking_number == tn, Shipment.carrier == carrier, Shipment.user_id == client.id)
        ).scalar_one_or_none()
        if s:
            return s
        raw = {
            "seed": True,
            "service_level": service_level,
            "last_event_at": last_event_at.isoformat(),
        }
        if keywords:
            raw["notes"] = " ".join(keywords)

        s = Shipment(
            user_id=client.id,
            tracking_number=tn,
            carrier=carrier,
            origin=origin,
            destination=destination,
            status=status,
            estimated_delivery=estimated_delivery,
            raw_data=raw,
        )
        # Force updated_at to align with last_event_at for lost detection fallback.
        s.updated_at = last_event_at
        db.add(s)
        return s

    created_shipments: list[Shipment] = []

    # A few deterministic “story” shipments to guarantee each detection type exists.
    created_shipments.append(
        upsert_seed_shipment(
            tn="SEED-TRK-0001",
            carrier="DHL",
            origin="HCMC",
            destination="Hanoi",
            status="in_transit",
            estimated_delivery=now - timedelta(hours=80),
            last_event_at=now - timedelta(days=1),
            service_level="standard",
        )
    )  # delay critical by ETA
    created_shipments.append(
        upsert_seed_shipment(
            tn="SEED-TRK-0002",
            carrier="FedEx",
            origin="Hanoi",
            destination="Da Nang",
            status="in_transit",
            estimated_delivery=now - timedelta(hours=30),
            last_event_at=now - timedelta(days=2),
            service_level="express",
        )
    )  # delay high
    created_shipments.append(
        upsert_seed_shipment(
            tn="SEED-TRK-0003",
            carrier="UPS",
            origin="Da Nang",
            destination="Hue",
            status="in_transit",
            estimated_delivery=now + timedelta(days=2),
            last_event_at=now - timedelta(days=9),
            service_level="standard",
        )
    )  # stale lost high
    created_shipments.append(
        upsert_seed_shipment(
            tn="SEED-TRK-0004",
            carrier="DHL",
            origin="HCMC",
            destination="Singapore",
            status="exception",
            estimated_delivery=now + timedelta(days=1),
            last_event_at=now - timedelta(hours=5),
            service_level="express",
            keywords=["damaged", "crushed"],
        )
    )  # damage + custom rule (DHL + exception)
    created_shipments.append(
        upsert_seed_shipment(
            tn="SEED-TRK-0005",
            carrier="GHN",
            origin="Hai Phong",
            destination="Hong Kong",
            status="held",
            estimated_delivery=now + timedelta(days=4),
            last_event_at=now - timedelta(hours=12),
            service_level="priority",
            keywords=["customs", "inspection"],
        )
    )  # customs keyword + destination rule
    created_shipments.append(
        upsert_seed_shipment(
            tn="SEED-TRK-0006",
            carrier="GHTK",
            origin="Hanoi",
            destination="Bangkok",
            status="recipient unavailable",
            estimated_delivery=now + timedelta(days=3),
            last_event_at=now - timedelta(hours=20),
            service_level="standard",
            keywords=["address not found"],
        )
    )  # wrong_address keyword

    # Generate additional shipments (to reach 30+), mix of carriers/status/severity.
    # Create a variety of ETAs and last_event_at so detection yields diverse exceptions.
    for i in range(7, 41):  # 34 shipments total including 6 above
        tn = f"SEED-TRK-{i:04d}"
        carrier = rng.choice(carriers)
        origin = rng.choice(origins)
        destination = rng.choice(destinations)
        status = rng.choice(statuses)
        service_level = rng.choice(service_levels)

        # last_event_at up to 20 days ago
        last_days_ago = rng.randint(0, 20)
        last_event_at = now - timedelta(days=last_days_ago, hours=rng.randint(0, 23))

        # ETA around now: some in past (delay), some future
        eta_shift_hours = rng.randint(-120, 96)
        estimated_delivery = now + timedelta(hours=eta_shift_hours)

        # Inject some keywords for damage/customs/address issues
        keywords: list[str] | None = None
        roll = rng.random()
        if roll < 0.10:
            keywords = ["damaged"]
            status = "exception"
        elif roll < 0.18:
            keywords = ["customs", "clearance held"]
            status = "held"
        elif roll < 0.23:
            keywords = ["address incorrect"]
            status = "exception"

        s = upsert_seed_shipment(
            tn=tn,
            carrier=carrier,
            origin=origin,
            destination=destination,
            status=status,
            estimated_delivery=estimated_delivery,
            last_event_at=last_event_at,
            service_level=service_level,
            keywords=keywords,
        )
        created_shipments.append(s)

    db.commit()

    # --- Auto-detect exceptions after seed (idempotent via dedupe in persist_detected) ---
    # Refresh shipments so ids are present for newly created rows.
    seeded_shipments = db.execute(select(Shipment).where(Shipment.user_id == client.id)).scalars().all()
    total_created = 0
    for s in seeded_shipments:
        created_exc = persist_detected(db, s, detect_for_shipment(db, s))
        if created_exc:
            total_created += len(created_exc)
    if total_created:
        db.commit()

