from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ExceptionRecord(Base):
    __tablename__ = "exceptions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    shipment_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("shipments.id", ondelete="CASCADE"), index=True)
    shipment = relationship("Shipment")

    type: Mapped[str] = mapped_column(String(64))  # delay|lost|custom...
    severity: Mapped[str] = mapped_column(String(32), default="medium")
    description: Mapped[str] = mapped_column(Text)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_by_user = relationship("User")

    status: Mapped[str] = mapped_column(String(32), default="open")  # open|investigating|resolved|dismissed
    auto_detected: Mapped[bool] = mapped_column(Boolean, default=True)

