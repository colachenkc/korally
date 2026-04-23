from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_serializer

from app.schemas._utc import serialize_utc


class MatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tournament_id: int
    table_id: int | None
    match_no: str
    category_label: str | None = None
    status: str
    player_a_name_manual: str | None
    player_b_name_manual: str | None
    winner_name_manual: str | None
    score_summary: str | None
    actual_start_time: datetime | None
    actual_end_time: datetime | None
    remarks: str | None

    @field_serializer("actual_start_time", "actual_end_time", when_used="json")
    def _ser_dt(self, dt: datetime | None) -> str | None:
        return serialize_utc(dt)


class MatchStart(BaseModel):
    player_a_name: str
    player_b_name: str
    category_label: str | None = None
    remarks: str | None = None


class MatchFinish(BaseModel):
    winner_side: str  # "A" | "B"
    score_summary: str | None = None
