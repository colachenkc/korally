from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin


class Match(Base, TimestampMixin):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    stage_id: Mapped[int | None] = mapped_column(ForeignKey("stages.id", ondelete="SET NULL"))
    group_id: Mapped[int | None] = mapped_column(ForeignKey("groups.id", ondelete="SET NULL"))

    match_no: Mapped[str] = mapped_column(String(64), nullable=False)
    round_no: Mapped[int | None] = mapped_column(Integer)
    bracket_slot: Mapped[str | None] = mapped_column(String(64))
    stage_type: Mapped[str | None] = mapped_column(String(32))  # round_robin | knockout
    category_label: Mapped[str | None] = mapped_column(String(64))

    scheduled_date: Mapped[date | None] = mapped_column(Date)
    scheduled_start_time: Mapped[str | None] = mapped_column(String(16))
    scheduled_end_time: Mapped[str | None] = mapped_column(String(16))
    actual_start_time: Mapped[datetime | None] = mapped_column(DateTime)
    actual_end_time: Mapped[datetime | None] = mapped_column(DateTime)

    table_id: Mapped[int | None] = mapped_column(ForeignKey("tables.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(32), default="scheduled", nullable=False)
    # scheduled | preparing | in_progress | finished | delayed | cancelled

    player_a_id: Mapped[int | None] = mapped_column(ForeignKey("participants.id", ondelete="SET NULL"))
    player_b_id: Mapped[int | None] = mapped_column(ForeignKey("participants.id", ondelete="SET NULL"))
    player_a_name_manual: Mapped[str | None] = mapped_column(String(120))
    player_b_name_manual: Mapped[str | None] = mapped_column(String(120))

    best_of_sets: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    sets_to_win: Mapped[int] = mapped_column(Integer, default=3, nullable=False)

    winner_id: Mapped[int | None] = mapped_column(ForeignKey("participants.id", ondelete="SET NULL"))
    winner_name_manual: Mapped[str | None] = mapped_column(String(120))
    score_summary: Mapped[str | None] = mapped_column(String(200))

    source_type: Mapped[str] = mapped_column(String(32), default="manual_entry", nullable=False)
    csv_batch_id: Mapped[int | None] = mapped_column(ForeignKey("schedule_import_batches.id", ondelete="SET NULL"))
    next_match_id: Mapped[int | None] = mapped_column(ForeignKey("matches.id", ondelete="SET NULL"))
    remarks: Mapped[str | None] = mapped_column(Text)

    tournament: Mapped["Tournament"] = relationship(back_populates="matches")  # noqa: F821
    stage: Mapped["Stage | None"] = relationship(back_populates="matches")  # noqa: F821
    group: Mapped["Group | None"] = relationship(back_populates="matches")  # noqa: F821
    table: Mapped["Table | None"] = relationship(  # noqa: F821
        back_populates="matches",
        foreign_keys=[table_id],
    )
    player_a: Mapped["Participant | None"] = relationship(foreign_keys=[player_a_id])  # noqa: F821
    player_b: Mapped["Participant | None"] = relationship(foreign_keys=[player_b_id])  # noqa: F821
    winner: Mapped["Participant | None"] = relationship(foreign_keys=[winner_id])  # noqa: F821
    set_scores: Mapped[list["MatchSetScore"]] = relationship(  # noqa: F821
        back_populates="match", cascade="all, delete-orphan", order_by="MatchSetScore.set_no"
    )
    referee_assignments: Mapped[list["MatchRefereeAssignment"]] = relationship(  # noqa: F821
        back_populates="match", cascade="all, delete-orphan"
    )
    progress_logs: Mapped[list["MatchProgressLog"]] = relationship(  # noqa: F821
        back_populates="match", cascade="all, delete-orphan", order_by="MatchProgressLog.created_at"
    )
