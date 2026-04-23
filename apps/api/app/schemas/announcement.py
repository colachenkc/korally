from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ScheduleAnnouncementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tournament_id: int
    title: str
    pdf_url: str
    effective_date: date | None = None
    note: str | None = None
    uploaded_by: str | None = None
    created_at: datetime
