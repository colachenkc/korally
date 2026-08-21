from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import require_admin
from app.models.match import Match
from app.models.table import Table
from app.models.tournament import Tournament
from app.schemas.match import MatchCreate, MatchRead, MatchUpdate

router = APIRouter(prefix="/matches", tags=["matches"])

VALID_KINDS = {"singles", "doubles", "team_tie"}


@router.get("", response_model=list[MatchRead])
def list_matches(
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
) -> list[Match]:
    query = db.query(Match)
    if status_filter:
        query = query.filter(Match.status == status_filter)
    return query.order_by(Match.id.desc()).all()


@router.post(
    "",
    response_model=MatchRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_match(payload: MatchCreate, db: Session = Depends(get_db)) -> Match:
    if payload.match_kind not in VALID_KINDS:
        raise HTTPException(status_code=400, detail=f"match_kind must be one of {sorted(VALID_KINDS)}")

    tournament = db.query(Tournament).order_by(Tournament.id.asc()).first()
    if not tournament:
        raise HTTPException(status_code=400, detail="No tournament exists yet")

    match_no = payload.match_no
    if not match_no:
        next_no = db.query(Match).filter(Match.tournament_id == tournament.id).count() + 1
        match_no = f"M{next_no:03d}"

    match = Match(
        tournament_id=tournament.id,
        match_no=match_no,
        status=payload.status,
        match_kind=payload.match_kind,
        category_label=payload.category_label,
        group_id=payload.group_id,
        player_a_name_manual=payload.player_a_name_manual,
        player_b_name_manual=payload.player_b_name_manual,
        winner_name_manual=payload.winner_name_manual,
        team_a_id=payload.team_a_id,
        team_b_id=payload.team_b_id,
        winner_team_id=payload.winner_team_id,
        score_summary=payload.score_summary,
        source_type="manual_entry",
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


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


@router.delete(
    "/{match_id}",
    status_code=204,
    dependencies=[Depends(require_admin)],
)
def delete_match(match_id: int, db: Session = Depends(get_db)) -> Response:
    match = db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # SQLite's ON DELETE SET NULL requires PRAGMA foreign_keys=ON (off by default),
    # so clear back-references explicitly to avoid dangling FKs.
    db.query(Table).filter(Table.current_match_id == match_id).update(
        {Table.current_match_id: None, Table.status: "idle"},
        synchronize_session=False,
    )
    db.query(Match).filter(Match.next_match_id == match_id).update(
        {Match.next_match_id: None},
        synchronize_session=False,
    )

    # Children (set_scores / referee_assignments / progress_logs) drop via ORM cascade.
    db.delete(match)
    db.commit()
    return Response(status_code=204)
