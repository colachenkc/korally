from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_serializer

from app.schemas._utc import serialize_utc
from app.schemas.match import MatchRead


class TableBase(BaseModel):
    table_no: str
    zone: str | None = None


class TableCreate(TableBase):
    tournament_id: int | None = None


class TableUpdate(BaseModel):
    table_no: str | None = None
    zone: str | None = None
    status: str | None = None
    referees_text: str | None = None


class TableCallCreate(BaseModel):
    side: Literal["A", "B", "BOTH"]


class TableRead(TableBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tournament_id: int
    status: str
    current_match_id: int | None
    referees_text: str | None = None
    call_side: str | None = None
    call_player_name: str | None = None
    call_created_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    @field_serializer("call_created_at", when_used="json")
    def _ser_call_dt(self, dt: datetime | None) -> str | None:
        return serialize_utc(dt)


class TableWithCurrentMatch(TableRead):
    current_match: MatchRead | None = None
