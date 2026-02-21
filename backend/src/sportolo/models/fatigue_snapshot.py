from __future__ import annotations

from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import JSON, Date, DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from sportolo.models.base import Base


class FatigueSnapshot(Base):
    __tablename__ = "fatigue_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    athlete_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)

    global_neural: Mapped[float] = mapped_column(Float, nullable=False)
    global_metabolic: Mapped[float] = mapped_column(Float, nullable=False)

    regional_recruitment: Mapped[dict[str, float]] = mapped_column(JSON, nullable=False)
    regional_metabolic: Mapped[dict[str, float]] = mapped_column(JSON, nullable=False)
    regional_mechanical: Mapped[dict[str, float]] = mapped_column(JSON, nullable=False)

    derived_recruitment: Mapped[float | None] = mapped_column(Float, nullable=True)

    system_capacity_sleep: Mapped[int | None] = mapped_column(Integer, nullable=True)
    system_capacity_fuel: Mapped[int] = mapped_column(Integer, nullable=False)
    system_capacity_stress: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
