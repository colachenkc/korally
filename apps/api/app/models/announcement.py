from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ScheduleAnnouncement(Base):
    __tablename__ = "schedule_announcements"

    id: Mapped[int] = mapped_column(primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    # DEPRECATED (Phase 1 dual-write): kept for backward compat, prefer stage_id.
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    stage_id: Mapped[int | None] = mapped_column(ForeignKey("stages.id", ondelete="SET NULL"))
    pdf_url: Mapped[str] = mapped_column(String(500), nullable=False)
    effective_date: Mapped[date | None] = mapped_column(Date)
    note: Mapped[str | None] = mapped_column(Text)
    uploaded_by: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
