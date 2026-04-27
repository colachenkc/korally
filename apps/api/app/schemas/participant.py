from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from app.schemas._utc import serialize_utc

ParticipantCategory = Literal["men_singles", "women_singles", "doubles"]


class ParticipantBase(BaseModel):
    category: ParticipantCategory
    name: str = Field(min_length=1, max_length=120)
    team: str | None = None
    student_id: str | None = None
    pair_no: int | None = None
    seed: int | None = None


class ParticipantCreate(ParticipantBase):
    tournament_id: int | None = None


class ParticipantUpdate(BaseModel):
    category: ParticipantCategory | None = None
    name: str | None = None
    team: str | None = None
    student_id: str | None = None
    pair_no: int | None = None
    seed: int | None = None


class ParticipantRead(ParticipantBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tournament_id: int
    checked_in: bool
    checked_in_at: datetime | None

    @field_serializer("checked_in_at", when_used="json")
    def _ser_check_dt(self, dt: datetime | None) -> str | None:
        return serialize_utc(dt)
