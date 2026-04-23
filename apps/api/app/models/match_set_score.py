from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin


class MatchSetScore(Base, TimestampMixin):
    __tablename__ = "match_set_scores"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    set_no: Mapped[int] = mapped_column(Integer, nullable=False)
    player_a_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    player_b_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    winner_side: Mapped[str | None] = mapped_column(String(8))  # "A" | "B" | None

    match: Mapped["Match"] = relationship(back_populates="set_scores")  # noqa: F821
