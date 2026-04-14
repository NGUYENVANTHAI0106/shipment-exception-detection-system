"""init

Revision ID: 0001_init
Revises: 
Create Date: 2026-04-14
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("company_name", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "shipments",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("tracking_number", sa.String(length=128), nullable=False),
        sa.Column("carrier", sa.String(length=64), nullable=False),
        sa.Column("origin", sa.String(length=255), nullable=True),
        sa.Column("destination", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("current_location", sa.String(length=255), nullable=True),
        sa.Column("estimated_delivery", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_delivery", sa.DateTime(timezone=True), nullable=True),
        sa.Column("weight", sa.Float(), nullable=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("raw_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_shipments_tracking", "shipments", ["tracking_number"], unique=False)
    op.create_index("ix_shipments_user_id", "shipments", ["user_id"], unique=False)

    op.create_table(
        "detection_rules",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("conditions", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_detection_rules_type", "detection_rules", ["type"], unique=False)

    op.create_table(
        "exceptions",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("shipment_id", sa.BigInteger(), sa.ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("auto_detected", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_index("ix_exceptions_shipment_id", "exceptions", ["shipment_id"], unique=False)
    op.create_index("ix_exceptions_status", "exceptions", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_exceptions_status", table_name="exceptions")
    op.drop_index("ix_exceptions_shipment_id", table_name="exceptions")
    op.drop_table("exceptions")

    op.drop_index("ix_detection_rules_type", table_name="detection_rules")
    op.drop_table("detection_rules")

    op.drop_index("ix_shipments_user_id", table_name="shipments")
    op.drop_index("ix_shipments_tracking", table_name="shipments")
    op.drop_table("shipments")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
