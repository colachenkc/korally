from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MainDeskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tournament_id: int
    name: str
    status_text: str | None
    location: str | None
    members_text: str | None = None
    created_at: datetime
    updated_at: datetime


class MainDeskUpdate(BaseModel):
    name: str | None = None
    status_text: str | None = None
    location: str | None = None
    members_text: str | None = None
