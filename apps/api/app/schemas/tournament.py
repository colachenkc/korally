from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class TournamentBase(BaseModel):
    name: str
    venue: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str = "draft"
    current_schedule_time: str | None = None
    announcement_pdf_url: str | None = None
    announcement_text: str | None = None
    schedule_pdf_url: str | None = None


class TournamentCreate(TournamentBase):
    pass


class TournamentUpdate(BaseModel):
    name: str | None = None
    venue: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = None
    current_schedule_time: str | None = None
    announcement_pdf_url: str | None = None
    announcement_text: str | None = None
    schedule_pdf_url: str | None = None


class TournamentRead(TournamentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
