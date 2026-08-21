from pydantic import BaseModel, ConfigDict, Field


class GroupBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    display_order: int = 0
    stage_id: int | None = None


class GroupCreate(GroupBase):
    tournament_id: int | None = None


class GroupUpdate(BaseModel):
    name: str | None = None
    display_order: int | None = None
    stage_id: int | None = None


class GroupRead(GroupBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tournament_id: int


class StandingRow(BaseModel):
    """One row in a standings table. `entity_kind` is 'participant' or 'team'."""

    entity_kind: str
    entity_id: int | None
    name: str
    wins: int
    losses: int
    matches_played: int
    win_rate: float


class StandingsRead(BaseModel):
    group_id: int
    group_name: str
    # Auto-detected from the matches in this group. "singles" | "doubles" | "team_tie" | "mixed"
    match_kind: str
    rows: list[StandingRow]
