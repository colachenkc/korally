from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import require_admin
from app.models.match import Match
from app.schemas.match import MatchRead, MatchUpdate

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("", response_model=list[MatchRead])
def list_matches(
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
) -> list[Match]:
    query = db.query(Match)
    if status_filter:
        query = query.filter(Match.status == status_filter)
    return query.order_by(Match.id.desc()).all()


@router.get("/{match_id}", response_model=MatchRead)
def get_match(match_id: int, db: Session = Depends(get_db)) -> Match:
    match = db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.patch(
    "/{match_id}",
    response_model=MatchRead,
    dependencies=[Depends(require_admin)],
)
def update_match(match_id: int, payload: MatchUpdate, db: Session = Depends(get_db)) -> Match:
    match = db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(match, field, value)
    db.commit()
    db.refresh(match)
    return match
