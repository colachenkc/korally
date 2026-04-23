from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column


from app.core.database import Base


class ScheduleImportBatch(Base):
    __tablename__ = "schedule_import_batches"

    id: Mapped[int] = mapped_column(primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), default="csv", nullable=False)
    imported_by: Mapped[str | None] = mapped_column(String(120))
    imported_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    success_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
