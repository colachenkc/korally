from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import require_admin
from app.models.group import Group
from app.models.match import Match
from app.models.team import Team
from app.models.tournament import Tournament
from app.schemas.group import (
    GroupCreate,
    GroupRead,
    GroupUpdate,
    StandingRow,
    StandingsRead,
)

router = APIRouter(prefix="/groups", tags=["groups"])


def _resolve_tournament_id(db: Session, tournament_id: int | None) -> int:
    if tournament_id is not None:
        if not db.get(Tournament, tournament_id):
            raise HTTPException(status_code=404, detail="Tournament not found")
        return tournament_id
    first = db.query(Tournament).order_by(Tournament.id.asc()).first()
    if not first:
        raise HTTPException(status_code=400, detail="No tournament exists yet")
    return first.id


@router.get("", response_model=list[GroupRead])
def list_groups(db: Session = Depends(get_db)) -> list[Group]:
    return db.query(Group).order_by(Group.display_order.asc(), Group.id.asc()).all()


@router.post(
    "",
    response_model=GroupRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_group(payload: GroupCreate, db: Session = Depends(get_db)) -> Group:
    tournament_id = _resolve_tournament_id(db, payload.tournament_id)
    group = Group(
        tournament_id=tournament_id,
        name=payload.name.strip(),
        display_order=payload.display_order,
        stage_id=payload.stage_id,
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.patch(
    "/{group_id}",
    response_model=GroupRead,
    dependencies=[Depends(require_admin)],
)
def update_group(group_id: int, payload: GroupUpdate, db: Session = Depends(get_db)) -> Group:
    group = db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and isinstance(data["name"], str):
        data["name"] = data["name"].strip() or group.name
    for field, value in data.items():
        setattr(group, field, value)
    db.commit()
    db.refresh(group)
    return group


@router.delete(
    "/{group_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_group(group_id: int, db: Session = Depends(get_db)) -> None:
    group = db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    # Break Match.group_id back-refs so we don't leave dangling FKs when SQLite
    # PRAGMA foreign_keys is off. Existing matches stay, just detach.
    db.query(Match).filter(Match.group_id == group_id).update(
        {Match.group_id: None},
        synchronize_session=False,
    )
    db.delete(group)
    db.commit()


@router.get("/{group_id}/standings", response_model=StandingsRead)
def group_standings(group_id: int, db: Session = Depends(get_db)) -> StandingsRead:
    group = db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    matches = (
        db.query(Match)
        .filter(Match.group_id == group_id, Match.status == "finished")
        .all()
    )

    # Detect kind from finished matches. Empty group defaults to singles.
    kinds = {m.match_kind or "singles" for m in matches}
    detected_kind = next(iter(kinds)) if len(kinds) == 1 else ("mixed" if kinds else "singles")

    if detected_kind == "team_tie":
        rows = _team_standings(db, group_id, matches)
    else:
        rows = _participant_standings(matches)

    return StandingsRead(
        group_id=group_id,
        group_name=group.name,
        match_kind=detected_kind,
        rows=rows,
    )


def _team_standings(db: Session, group_id: int, matches: list[Match]) -> list[StandingRow]:
    """Aggregate W/L per team using winner_team_id."""
    wins: dict[int, int] = defaultdict(int)
    played: dict[int, int] = defaultdict(int)
    team_ids: set[int] = set()

    for m in matches:
        if m.team_a_id:
            played[m.team_a_id] += 1
            team_ids.add(m.team_a_id)
        if m.team_b_id:
            played[m.team_b_id] += 1
            team_ids.add(m.team_b_id)
        if m.winner_team_id:
            wins[m.winner_team_id] += 1
            team_ids.add(m.winner_team_id)

    teams_by_id = {
        t.id: t
        for t in db.query(Team).filter(Team.id.in_(team_ids)).all()
    } if team_ids else {}

    rows: list[StandingRow] = []
    for tid in team_ids:
        team = teams_by_id.get(tid)
        w = wins.get(tid, 0)
        p = played.get(tid, 0)
        l = max(p - w, 0)
        rows.append(
            StandingRow(
                entity_kind="team",
                entity_id=tid,
                name=team.name if team else f"Team #{tid}",
                wins=w,
                losses=l,
                matches_played=p,
                win_rate=round(w / p, 3) if p else 0.0,
            )
        )
    return _sort_rows(rows)


def _participant_standings(matches: list[Match]) -> list[StandingRow]:
    """Aggregate W/L per participant name (using *_name_manual fields).

    We key by name because singles/doubles matches often use the manual name fields
    even when player_*_id is null (data entry via UI, not roster picker).
    """
    wins: dict[str, int] = defaultdict(int)
    played: dict[str, int] = defaultdict(int)
    names: set[str] = set()

    for m in matches:
        a = (m.player_a_name_manual or "").strip()
        b = (m.player_b_name_manual or "").strip()
        w = (m.winner_name_manual or "").strip()
        if a:
            played[a] += 1
            names.add(a)
        if b:
            played[b] += 1
            names.add(b)
        if w:
            wins[w] += 1
            names.add(w)

    rows: list[StandingRow] = []
    for name in names:
        won = wins.get(name, 0)
        p = played.get(name, 0)
        losses = max(p - won, 0)
        rows.append(
            StandingRow(
                entity_kind="participant",
                entity_id=None,
                name=name,
                wins=won,
                losses=losses,
                matches_played=p,
                win_rate=round(won / p, 3) if p else 0.0,
            )
        )
    return _sort_rows(rows)


def _sort_rows(rows: list[StandingRow]) -> list[StandingRow]:
    return sorted(
        rows,
        key=lambda r: (-r.wins, r.losses, -r.win_rate, r.name),
    )
