from datetime import date

from sqlalchemy import Date, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin


class Tournament(Base, TimestampMixin):
    __tablename__ = "tournaments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    venue: Mapped[str | None] = mapped_column(String(255))
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)
    current_schedule_time: Mapped[str | None] = mapped_column(String(32))
    announcement_pdf_url: Mapped[str | None] = mapped_column(String(500))
    announcement_text: Mapped[str | None] = mapped_column(Text)
    schedule_pdf_url: Mapped[str | None] = mapped_column(String(500))

    stages: Mapped[list["Stage"]] = relationship(back_populates="tournament", cascade="all, delete-orphan")  # noqa: F821
    groups: Mapped[list["Group"]] = relationship(back_populates="tournament", cascade="all, delete-orphan")  # noqa: F821
    tables: Mapped[list["Table"]] = relationship(back_populates="tournament", cascade="all, delete-orphan")  # noqa: F821
    matches: Mapped[list["Match"]] = relationship(back_populates="tournament", cascade="all, delete-orphan")  # noqa: F821
    participants: Mapped[list["Participant"]] = relationship(  # noqa: F821
        back_populates="tournament", cascade="all, delete-orphan"
    )
    referees: Mapped[list["Referee"]] = relationship(  # noqa: F821
        back_populates="tournament", cascade="all, delete-orphan"
    )
    main_desks: Mapped[list["MainDesk"]] = relationship(  # noqa: F821
        back_populates="tournament", cascade="all, delete-orphan"
    )
