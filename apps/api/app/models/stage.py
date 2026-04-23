from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Stage(Base):
    __tablename__ = "stages"

    id: Mapped[int] = mapped_column(primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    stage_type: Mapped[str] = mapped_column(String(32), nullable=False)  # round_robin | knockout
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    tournament: Mapped["Tournament"] = relationship(back_populates="stages")  # noqa: F821
    groups: Mapped[list["Group"]] = relationship(back_populates="stage", cascade="all, delete-orphan")  # noqa: F821
    matches: Mapped[list["Match"]] = relationship(back_populates="stage")  # noqa: F821
