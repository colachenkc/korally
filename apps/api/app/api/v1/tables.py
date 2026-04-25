from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import require_admin
from app.models.match import Match
from app.models.table import Table
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

    next_no = (db.query(Match).filter(Match.tournament_id == table.tournament_id).count()) + 1
    match = Match(
        tournament_id=table.tournament_id,
        table_id=table.id,
        match_no=f"M{next_no:03d}",
        category_label=payload.category_label,
        status="in_progress",
        player_a_name_manual=payload.player_a_name,
        player_b_name_manual=payload.player_b_name,
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
    match.winner_name_manual = (
        match.player_a_name_manual if payload.winner_side == "A" else match.player_b_name_manual
    )
    match.score_summary = payload.score_summary

    table.current_match_id = None
    table.status = "idle"
    table.call_side = None
    table.call_player_name = None
    table.call_created_at = None
    db.commit()
    db.refresh(match)
    return match


@router.post(
    "/{table_id}/call",
    response_model=TableWithCurrentMatch,
    dependencies=[Depends(require_admin)],
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
    db.commit()
    db.refresh(table)
    return table


@router.delete(
    "/{table_id}/call",
    response_model=TableWithCurrentMatch,
    dependencies=[Depends(require_admin)],
)
def clear_call(table_id: int, db: Session = Depends(get_db)) -> Table:
    table = db.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    table.call_side = None
    table.call_player_name = None
    table.call_created_at = None
    db.commit()
    db.refresh(table)
    return table
