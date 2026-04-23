from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    stage_id: Mapped[int | None] = mapped_column(ForeignKey("stages.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    tournament: Mapped["Tournament"] = relationship(back_populates="groups")  # noqa: F821
    stage: Mapped["Stage | None"] = relationship(back_populates="groups")  # noqa: F821
    participants: Mapped[list["Participant"]] = relationship(back_populates="group")  # noqa: F821
    matches: Mapped[list["Match"]] = relationship(back_populates="group")  # noqa: F821
