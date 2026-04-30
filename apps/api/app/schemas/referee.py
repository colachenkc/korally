from pydantic import BaseModel, ConfigDict, Field


class RefereeBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    level: str | None = None
    contact: str | None = None
    note: str | None = None


class RefereeCreate(RefereeBase):
    tournament_id: int | None = None


class RefereeUpdate(BaseModel):
    name: str | None = None
    level: str | None = None
    contact: str | None = None
    note: str | None = None


class RefereeRead(RefereeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tournament_id: int
