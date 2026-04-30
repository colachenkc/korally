from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import require_admin
from app.models.referee import Referee
from app.models.tournament import Tournament
from app.schemas.referee import RefereeCreate, RefereeRead, RefereeUpdate

router = APIRouter(prefix="/referees", tags=["referees"])


def _resolve_tournament_id(db: Session, tournament_id: int | None) -> int:
    if tournament_id is not None:
        if not db.get(Tournament, tournament_id):
            raise HTTPException(status_code=404, detail="Tournament not found")
        return tournament_id
    first = db.query(Tournament).order_by(Tournament.id.asc()).first()
    if not first:
        raise HTTPException(status_code=400, detail="No tournament exists yet")
    return first.id


@router.get("", response_model=list[RefereeRead])
def list_referees(db: Session = Depends(get_db)) -> list[Referee]:
    return db.query(Referee).order_by(Referee.id.asc()).all()


@router.post(
    "",
    response_model=RefereeRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_referee(payload: RefereeCreate, db: Session = Depends(get_db)) -> Referee:
    tournament_id = _resolve_tournament_id(db, payload.tournament_id)
    r = Referee(
        tournament_id=tournament_id,
        name=payload.name.strip(),
        level=(payload.level or "").strip() or None,
        contact=(payload.contact or "").strip() or None,
        note=(payload.note or "").strip() or None,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.patch(
    "/{referee_id}",
    response_model=RefereeRead,
    dependencies=[Depends(require_admin)],
)
def update_referee(
    referee_id: int, payload: RefereeUpdate, db: Session = Depends(get_db)
) -> Referee:
    r = db.get(Referee, referee_id)
    if not r:
        raise HTTPException(status_code=404, detail="Referee not found")
    data = payload.model_dump(exclude_unset=True)
    for f in ("name", "level", "contact", "note"):
        if f in data and isinstance(data[f], str):
            data[f] = data[f].strip() or (None if f != "name" else r.name)
    for field, value in data.items():
        setattr(r, field, value)
    db.commit()
    db.refresh(r)
    return r


@router.delete(
    "/{referee_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_referee(referee_id: int, db: Session = Depends(get_db)) -> None:
    r = db.get(Referee, referee_id)
    if not r:
        raise HTTPException(status_code=404, detail="Referee not found")
    db.delete(r)
    db.commit()
