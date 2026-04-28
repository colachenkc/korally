from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import require_admin, require_referee_or_admin
from app.models.participant import Participant
from app.models.tournament import Tournament
from app.schemas.participant import ParticipantCreate, ParticipantRead, ParticipantUpdate

router = APIRouter(prefix="/participants", tags=["participants"])

_VALID_CATEGORIES = ("men_singles", "women_singles", "doubles")


def _resolve_tournament_id(db: Session, tournament_id: int | None) -> int:
    if tournament_id is not None:
        if not db.get(Tournament, tournament_id):
            raise HTTPException(status_code=404, detail="Tournament not found")
        return tournament_id
    first = db.query(Tournament).order_by(Tournament.id.asc()).first()
    if not first:
        raise HTTPException(status_code=400, detail="No tournament exists yet")
    return first.id


@router.get("", response_model=list[ParticipantRead])
def list_participants(
    category: str | None = Query(default=None, pattern="^(men_singles|women_singles|doubles)$"),
    student_id: str | None = Query(default=None, max_length=50),
    db: Session = Depends(get_db),
) -> list[Participant]:
    q = db.query(Participant)
    if category:
        q = q.filter(Participant.category == category)
    if student_id:
        q = q.filter(Participant.student_id == student_id)
    # Doubles: order by pair_no then id; singles: order by seed (NULLS LAST) then id.
    return q.order_by(
        Participant.pair_no.asc().nulls_last(),
        Participant.seed.asc().nulls_last(),
        Participant.id.asc(),
    ).all()


@router.post(
    "",
    response_model=ParticipantRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_participant(payload: ParticipantCreate, db: Session = Depends(get_db)) -> Participant:
    tournament_id = _resolve_tournament_id(db, payload.tournament_id)
    p = Participant(
        tournament_id=tournament_id,
        category=payload.category,
        name=payload.name.strip(),
        team=(payload.team or "").strip() or None,
        student_id=(payload.student_id or "").strip() or None,
        pair_no=payload.pair_no,
        seed=payload.seed,
        checked_in=False,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.patch(
    "/{participant_id}",
    response_model=ParticipantRead,
    dependencies=[Depends(require_admin)],
)
def update_participant(
    participant_id: int, payload: ParticipantUpdate, db: Session = Depends(get_db)
) -> Participant:
    p = db.get(Participant, participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    data = payload.model_dump(exclude_unset=True)
    for f in ("name", "team", "student_id"):
        if f in data and isinstance(data[f], str):
            data[f] = data[f].strip() or (None if f != "name" else p.name)
    for field, value in data.items():
        setattr(p, field, value)
    db.commit()
    db.refresh(p)
    return p


@router.delete(
    "/{participant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_participant(participant_id: int, db: Session = Depends(get_db)) -> None:
    p = db.get(Participant, participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    db.delete(p)
    db.commit()


@router.post(
    "/{participant_id}/check-in",
    response_model=ParticipantRead,
    dependencies=[Depends(require_referee_or_admin)],
)
def check_in(participant_id: int, db: Session = Depends(get_db)) -> Participant:
    p = db.get(Participant, participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    p.checked_in = True
    p.checked_in_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(p)
    return p


@router.delete(
    "/{participant_id}/check-in",
    response_model=ParticipantRead,
    dependencies=[Depends(require_admin)],
)
def undo_check_in(participant_id: int, db: Session = Depends(get_db)) -> Participant:
    p = db.get(Participant, participant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    p.checked_in = False
    p.checked_in_at = None
    db.commit()
    db.refresh(p)
    return p
