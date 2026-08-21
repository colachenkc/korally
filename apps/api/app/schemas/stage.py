from pydantic import BaseModel, ConfigDict, Field


class StageBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    stage_type: str = "round_robin"  # round_robin | knockout
    sort_order: int = 0
    description: str | None = None


class StageCreate(StageBase):
    tournament_id: int | None = None


class StageUpdate(BaseModel):
    name: str | None = None
    stage_type: str | None = None
    sort_order: int | None = None
    description: str | None = None


class StageRead(StageBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tournament_id: int
