from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import require_admin
from app.models.tournament import Tournament
from app.schemas.tournament import TournamentCreate, TournamentRead, TournamentUpdate

router = APIRouter(prefix="/tournaments", tags=["tournaments"])


@router.get("", response_model=list[TournamentRead])
def list_tournaments(db: Session = Depends(get_db)) -> list[Tournament]:
    return db.query(Tournament).order_by(Tournament.id.desc()).all()


@router.post(
    "",
    response_model=TournamentRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_tournament(payload: TournamentCreate, db: Session = Depends(get_db)) -> Tournament:
    tournament = Tournament(**payload.model_dump())
    db.add(tournament)
    db.commit()
    db.refresh(tournament)
    return tournament


@router.get("/{tournament_id}", response_model=TournamentRead)
def get_tournament(tournament_id: int, db: Session = Depends(get_db)) -> Tournament:
    tournament = db.get(Tournament, tournament_id)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament


@router.patch(
    "/{tournament_id}",
    response_model=TournamentRead,
    dependencies=[Depends(require_admin)],
)
def update_tournament(
    tournament_id: int, payload: TournamentUpdate, db: Session = Depends(get_db)
) -> Tournament:
    tournament = db.get(Tournament, tournament_id)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(tournament, field, value)
    db.commit()
    db.refresh(tournament)
    return tournament


@router.delete(
    "/{tournament_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_tournament(tournament_id: int, db: Session = Depends(get_db)) -> None:
    tournament = db.get(Tournament, tournament_id)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    db.delete(tournament)
    db.commit()
