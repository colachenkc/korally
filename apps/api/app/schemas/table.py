from datetime import datetime

from pydantic import BaseModel, ConfigDict

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


class TableRead(TableBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tournament_id: int
    status: str
    current_match_id: int | None
    referees_text: str | None = None
    created_at: datetime
    updated_at: datetime


class TableWithCurrentMatch(TableRead):
    current_match: MatchRead | None = None
