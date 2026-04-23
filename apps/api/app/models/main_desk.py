from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin


class MainDesk(Base, TimestampMixin):
    __tablename__ = "main_desks"

    id: Mapped[int] = mapped_column(primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    status_text: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(String(200))
    members_text: Mapped[str | None] = mapped_column(Text)

    tournament: Mapped["Tournament"] = relationship(back_populates="main_desks")  # noqa: F821
    members: Mapped[list["MainDeskMember"]] = relationship(
        back_populates="main_desk", cascade="all, delete-orphan"
    )


class MainDeskMember(Base):
    __tablename__ = "main_desk_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    main_desk_id: Mapped[int] = mapped_column(ForeignKey("main_desks.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str | None] = mapped_column(String(80))
    contact: Mapped[str | None] = mapped_column(String(200))
    shift_note: Mapped[str | None] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    main_desk: Mapped["MainDesk"] = relationship(back_populates="members")
