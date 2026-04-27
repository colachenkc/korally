from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import require_admin
from app.models.team import Team
from app.models.tournament import Tournament
from app.schemas.team import TeamCreate, TeamRead, TeamUpdate

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
    db: Session = Depends(get_db),
) -> list[Team]:
    q = db.query(Team)
    if division:
        q = q.filter(Team.division == division)
    return q.order_by(Team.division.asc(), Team.display_order.asc(), Team.id.asc()).all()


@router.post(
    "",
    response_model=TeamRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_team(payload: TeamCreate, db: Session = Depends(get_db)) -> Team:
    tournament_id = _resolve_tournament_id(db, payload.tournament_id)
    team = Team(
        tournament_id=tournament_id,
        division=payload.division,
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
