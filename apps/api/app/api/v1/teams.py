from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import require_admin
from app.models.stage import Stage
from app.models.team import Team
from app.models.tournament import Tournament
from app.schemas.team import TeamCreate, TeamRead, TeamUpdate

# Reverse mapping so admin picking a stage automatically fills the legacy
# `division` column. Kept in sync with the seed in app.main.
_STAGE_TO_DIVISION = {"公開男團": "men", "公開女團": "women"}


def _stage_to_division(name: str) -> str | None:
    if name in _STAGE_TO_DIVISION:
        return _STAGE_TO_DIVISION[name]
    # Best-effort for custom stages named like "教職員男團" or "友誼女團".
    if "男" in name:
        return "men"
    if "女" in name:
        return "women"
    return None

router = APIRouter(prefix="/teams", tags=["teams"])


def _resolve_tournament_id(db: Session, tournament_id: int | None) -> int:
    if tournament_id is not None:
        if not db.get(Tournament, tournament_id):
            raise HTTPException(status_code=404, detail="Tournament not found")
        return tournament_id
    first = db.query(Tournament).order_by(Tournament.id.asc()).first()
    if not first:
        raise HTTPException(status_code=400, detail="No tournament exists yet")
    return first.id


@router.get("", response_model=list[TeamRead])
def list_teams(
    division: str | None = Query(default=None, pattern="^(men|women)$"),
    stage_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[Team]:
    q = db.query(Team)
    if division:
        q = q.filter(Team.division == division)
    if stage_id is not None:
        q = q.filter(Team.stage_id == stage_id)
    return q.order_by(Team.division.asc(), Team.display_order.asc(), Team.id.asc()).all()


@router.post(
    "",
    response_model=TeamRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_team(payload: TeamCreate, db: Session = Depends(get_db)) -> Team:
    tournament_id = _resolve_tournament_id(db, payload.tournament_id)

    stage_id = payload.stage_id
    division = payload.division
    if stage_id is not None:
        stage = db.get(Stage, stage_id)
        if not stage:
            raise HTTPException(status_code=400, detail="stage_id refers to unknown stage")
        derived = _stage_to_division(stage.name)
        if derived is not None:
            division = derived  # stage wins over payload for legacy column

    team = Team(
        tournament_id=tournament_id,
        division=division,
        stage_id=stage_id,
        name=payload.name.strip(),
        department=(payload.department or "").strip() or None,
        members_text=payload.members_text,
        display_order=payload.display_order,
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


@router.patch(
    "/{team_id}",
    response_model=TeamRead,
    dependencies=[Depends(require_admin)],
)
def update_team(team_id: int, payload: TeamUpdate, db: Session = Depends(get_db)) -> Team:
    team = db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    data = payload.model_dump(exclude_unset=True)
    for field in ("name", "department"):
        if field in data and isinstance(data[field], str):
            data[field] = data[field].strip() or (None if field != "name" else team.name)
    # If admin swaps to a different stage, keep the legacy division column aligned.
    if "stage_id" in data and data["stage_id"] is not None:
        stage = db.get(Stage, data["stage_id"])
        if not stage:
            raise HTTPException(status_code=400, detail="stage_id refers to unknown stage")
        derived = _stage_to_division(stage.name)
        if derived is not None:
            data["division"] = derived
    for field, value in data.items():
        setattr(team, field, value)
    db.commit()
    db.refresh(team)
    return team


@router.delete(
    "/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_team(team_id: int, db: Session = Depends(get_db)) -> None:
    team = db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    db.delete(team)
    db.commit()
