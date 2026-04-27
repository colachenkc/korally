from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Division = Literal["men", "women"]


class TeamBase(BaseModel):
    division: Division
    name: str = Field(min_length=1, max_length=120)
    department: str | None = None
    members_text: str | None = None
    display_order: int = 0


class TeamCreate(TeamBase):
    tournament_id: int | None = None


class TeamUpdate(BaseModel):
    division: Division | None = None
    name: str | None = None
    department: str | None = None
    members_text: str | None = None
    display_order: int | None = None


class TeamRead(TeamBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tournament_id: int
