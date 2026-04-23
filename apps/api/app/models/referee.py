from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin


class Referee(Base, TimestampMixin):
    __tablename__ = "referees"

    id: Mapped[int] = mapped_column(primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    level: Mapped[str | None] = mapped_column(String(64))
    contact: Mapped[str | None] = mapped_column(String(200))
    note: Mapped[str | None] = mapped_column(Text)

    tournament: Mapped["Tournament"] = relationship(back_populates="referees")  # noqa: F821
    assignments: Mapped[list["MatchRefereeAssignment"]] = relationship(back_populates="referee")  # noqa: F821
