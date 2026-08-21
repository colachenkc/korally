from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import require_admin, require_referee_or_admin
from app.models.match import Match
from app.models.table import Table
from app.models.team import Team
from app.models.tournament import Tournament
from app.schemas.match import MatchFinish, MatchRead, MatchStart
from app.schemas.table import TableCallCreate, TableCreate, TableRead, TableUpdate, TableWithCurrentMatch

router = APIRouter(prefix="/tables", tags=["tables"])


def _resolve_tournament_id(db: Session, tournament_id: int | None) -> int:
    if tournament_id is not None:
        if not db.get(Tournament, tournament_id):
            raise HTTPException(status_code=404, detail="Tournament not found")
        return tournament_id
    first = db.query(Tournament).order_by(Tournament.id.asc()).first()
    if not first:
        raise HTTPException(status_code=400, detail="No tournament exists yet")
    return first.id


@router.get("", response_model=list[TableWithCurrentMatch])
def list_tables(db: Session = Depends(get_db)) -> list[Table]:
    return db.query(Table).order_by(Table.id.asc()).all()


@router.post(
    "",
    response_model=TableRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_table(payload: TableCreate, db: Session = Depends(get_db)) -> Table:
    tournament_id = _resolve_tournament_id(db, payload.tournament_id)
    table = Table(tournament_id=tournament_id, table_no=payload.table_no, zone=payload.zone)
    db.add(table)
    db.commit()
    db.refresh(table)
    return table


@router.patch(
    "/{table_id}",
    response_model=TableRead,
    dependencies=[Depends(require_admin)],
)
def update_table(table_id: int, payload: TableUpdate, db: Session = Depends(get_db)) -> Table:
    table = db.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(table, field, value)
    db.commit()
    db.refresh(table)
    return table


@router.delete(
    "/{table_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_table(table_id: int, db: Session = Depends(get_db)) -> None:
    table = db.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    if table.current_match_id:
        raise HTTPException(status_code=400, detail="Table has an ongoing match; finish it first")
    db.delete(table)
    db.commit()


@router.post(
    "/{table_id}/start-match",
    response_model=MatchRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def start_match(table_id: int, payload: MatchStart, db: Session = Depends(get_db)) -> Match:
    table = db.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    if table.current_match_id:
        raise HTTPException(status_code=400, detail="Table already has an ongoing match")

    kind = payload.match_kind or "singles"
    if kind not in ("singles", "doubles", "team_tie"):
        raise HTTPException(status_code=400, detail=f"Unknown match_kind: {kind}")

    team_a_id = payload.team_a_id
    team_b_id = payload.team_b_id
    player_a = payload.player_a_name
    player_b = payload.player_b_name

    if kind == "team_tie":
        if not team_a_id or not team_b_id:
            raise HTTPException(status_code=400, detail="team_tie requires team_a_id and team_b_id")
        team_a = db.get(Team, team_a_id)
        team_b = db.get(Team, team_b_id)
        if not team_a or not team_b:
            raise HTTPException(status_code=400, detail="team_a_id or team_b_id refers to unknown team")
        # Mirror team names into player_*_name_manual so legacy consumers (call modal,
        # existing live layouts) show something sensible without needing a Team lookup.
        player_a = team_a.name
        player_b = team_b.name
    else:
        if not player_a or not player_b:
            raise HTTPException(status_code=400, detail="player_a_name and player_b_name required")

    next_no = (db.query(Match).filter(Match.tournament_id == table.tournament_id).count()) + 1
    match = Match(
        tournament_id=table.tournament_id,
        table_id=table.id,
        match_no=f"M{next_no:03d}",
        match_kind=kind,
        category_label=payload.category_label,
        group_id=payload.group_id,
        status="in_progress",
        player_a_name_manual=player_a,
        player_b_name_manual=player_b,
        team_a_id=team_a_id if kind == "team_tie" else None,
        team_b_id=team_b_id if kind == "team_tie" else None,
        actual_start_time=datetime.now(timezone.utc),
        remarks=payload.remarks,
        source_type="manual_entry",
    )
    db.add(match)
    db.flush()

    table.current_match_id = match.id
    table.status = "in_progress"
    db.commit()
    db.refresh(match)
    return match


@router.post(
    "/{table_id}/finish-match",
    response_model=MatchRead,
    dependencies=[Depends(require_admin)],
)
def finish_match(table_id: int, payload: MatchFinish, db: Session = Depends(get_db)) -> Match:
    table = db.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    if not table.current_match_id:
        raise HTTPException(status_code=400, detail="Table has no ongoing match")

    match = db.get(Match, table.current_match_id)
    if not match:
        raise HTTPException(status_code=500, detail="Current match missing")

    if payload.winner_side not in ("A", "B"):
        raise HTTPException(status_code=400, detail="winner_side must be 'A' or 'B'")

    match.status = "finished"
    match.actual_end_time = datetime.now(timezone.utc)
    if match.match_kind == "team_tie":
        match.winner_team_id = match.team_a_id if payload.winner_side == "A" else match.team_b_id
        # Keep winner_name_manual as a display snapshot (was mirrored at start_match).
        match.winner_name_manual = (
            match.player_a_name_manual if payload.winner_side == "A" else match.player_b_name_manual
        )
    else:
        match.winner_name_manual = (
            match.player_a_name_manual if payload.winner_side == "A" else match.player_b_name_manual
        )
    match.score_summary = payload.score_summary

    table.current_match_id = None
    table.status = "idle"
    table.call_side = None
    table.call_player_name = None
    table.call_created_at = None
    table.call_broadcasted_at = None
    db.commit()
    db.refresh(match)
    return match


@router.post(
    "/{table_id}/call",
    response_model=TableWithCurrentMatch,
    dependencies=[Depends(require_referee_or_admin)],
)
def raise_call(table_id: int, payload: TableCallCreate, db: Session = Depends(get_db)) -> Table:
    table = db.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    if not table.current_match_id:
        raise HTTPException(status_code=400, detail="Table has no current match to call against")

    match = db.get(Match, table.current_match_id)
    if not match:
        raise HTTPException(status_code=500, detail="Current match missing")

    name_a = (match.player_a_name_manual or "").strip()
    name_b = (match.player_b_name_manual or "").strip()
    if payload.side == "A":
        snapshot = name_a or "選手 A"
    elif payload.side == "B":
        snapshot = name_b or "選手 B"
    else:
        parts = [p for p in (name_a, name_b) if p]
        snapshot = "、".join(parts) if parts else "兩位選手"

    table.call_side = payload.side
    table.call_player_name = snapshot
    table.call_created_at = datetime.now(timezone.utc)
    table.call_broadcasted_at = None
    db.commit()
    db.refresh(table)
    return table


@router.post(
    "/{table_id}/call/broadcast",
    response_model=TableWithCurrentMatch,
    dependencies=[Depends(require_admin)],
)
def mark_call_broadcasted(table_id: int, db: Session = Depends(get_db)) -> Table:
    table = db.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    if not table.call_side:
        raise HTTPException(status_code=400, detail="Table has no active call")
    table.call_broadcasted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(table)
    return table


@router.delete(
    "/{table_id}/call",
    response_model=TableWithCurrentMatch,
    dependencies=[Depends(require_referee_or_admin)],
)
def clear_call(table_id: int, db: Session = Depends(get_db)) -> Table:
    table = db.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    table.call_side = None
    table.call_player_name = None
    table.call_created_at = None
    table.call_broadcasted_at = None
    db.commit()
    db.refresh(table)
    return table
