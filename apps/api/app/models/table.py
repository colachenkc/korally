from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin


class Table(Base, TimestampMixin):
    __tablename__ = "tables"

    id: Mapped[int] = mapped_column(primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    table_no: Mapped[str] = mapped_column(String(32), nullable=False)
    zone: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(32), default="idle", nullable=False)
    # idle | preparing | in_progress | delayed | finished
    current_match_id: Mapped[int | None] = mapped_column(ForeignKey("matches.id", ondelete="SET NULL"))
    current_referee_note: Mapped[str | None] = mapped_column(Text)
    referees_text: Mapped[str | None] = mapped_column(Text)

    tournament: Mapped["Tournament"] = relationship(back_populates="tables")  # noqa: F821
    current_match: Mapped["Match | None"] = relationship(  # noqa: F821
        foreign_keys=[current_match_id], post_update=True
    )
    matches: Mapped[list["Match"]] = relationship(  # noqa: F821
        back_populates="table",
        foreign_keys="Match.table_id",
    )
