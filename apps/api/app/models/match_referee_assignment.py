from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MatchRefereeAssignment(Base):
    __tablename__ = "match_referee_assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    referee_id: Mapped[int] = mapped_column(ForeignKey("referees.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="chief", nullable=False)
    # chief | assistant | recorder
    assigned_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    released_at: Mapped[datetime | None] = mapped_column(DateTime)
    shift_note: Mapped[str | None] = mapped_column(Text)

    match: Mapped["Match"] = relationship(back_populates="referee_assignments")  # noqa: F821
    referee: Mapped["Referee"] = relationship(back_populates="assignments")  # noqa: F821
