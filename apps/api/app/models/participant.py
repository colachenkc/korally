from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin


class Participant(Base, TimestampMixin):
    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    team: Mapped[str | None] = mapped_column(String(120))
    student_id: Mapped[str | None] = mapped_column(String(50))
    # category values used by the public roster page: "men_singles" | "women_singles" | "doubles"
    category: Mapped[str | None] = mapped_column(String(80))
    seed: Mapped[int | None] = mapped_column(Integer)
    group_id: Mapped[int | None] = mapped_column(ForeignKey("groups.id", ondelete="SET NULL"))
    # Doubles partner grouping: two participants with the same pair_no form a pair.
    pair_no: Mapped[int | None] = mapped_column(Integer)
    # Check-in state for the participant roster.
    checked_in: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime)

    tournament: Mapped["Tournament"] = relationship(back_populates="participants")  # noqa: F821
    group: Mapped["Group | None"] = relationship(back_populates="participants")  # noqa: F821
