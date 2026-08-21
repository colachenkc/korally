from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_serializer

from app.schemas._utc import serialize_utc

MatchKind = str  # "singles" | "doubles" | "team_tie"


class MatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tournament_id: int
    table_id: int | None
    group_id: int | None = None
    match_no: str
    category_label: str | None = None
    status: str
    match_kind: str = "singles"
    player_a_name_manual: str | None
    player_b_name_manual: str | None
    winner_name_manual: str | None
    team_a_id: int | None = None
    team_b_id: int | None = None
    winner_team_id: int | None = None
    score_summary: str | None
    actual_start_time: datetime | None
    actual_end_time: datetime | None
    remarks: str | None

    @field_serializer("actual_start_time", "actual_end_time", when_used="json")
    def _ser_dt(self, dt: datetime | None) -> str | None:
        return serialize_utc(dt)


class MatchStart(BaseModel):
    # For singles/doubles: player_a_name / player_b_name required.
    # For team_tie: team_a_id / team_b_id required, players may be omitted.
    match_kind: str = "singles"
    player_a_name: str | None = None
    player_b_name: str | None = None
    team_a_id: int | None = None
    team_b_id: int | None = None
    group_id: int | None = None
    category_label: str | None = None
    remarks: str | None = None


class MatchFinish(BaseModel):
    winner_side: str  # "A" | "B"
    score_summary: str | None = None


class MatchCreate(BaseModel):
    """Create a match directly (usually to record a historical / finished result).

    For singles / doubles: set player_*_name_manual + winner_name_manual.
    For team_tie: set team_a_id / team_b_id + winner_team_id.
    """

    match_kind: str = "singles"
    category_label: str | None = None
    group_id: int | None = None
    match_no: str | None = None
    status: str = "finished"

    player_a_name_manual: str | None = None
    player_b_name_manual: str | None = None
    winner_name_manual: str | None = None
    team_a_id: int | None = None
    team_b_id: int | None = None
    winner_team_id: int | None = None
    score_summary: str | None = None


class MatchUpdate(BaseModel):
    match_kind: str | None = None
    category_label: str | None = None
    group_id: int | None = None

    player_a_name_manual: str | None = None
    player_b_name_manual: str | None = None
    winner_name_manual: str | None = None
    team_a_id: int | None = None
    team_b_id: int | None = None
    winner_team_id: int | None = None
    score_summary: str | None = None
