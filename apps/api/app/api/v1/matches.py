from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.match import Match
from app.schemas.match import MatchRead

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
