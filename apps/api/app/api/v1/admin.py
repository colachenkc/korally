from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import require_admin
from app.models.match import Match
from app.models.match_referee_assignment import MatchRefereeAssignment
from app.models.match_set_score import MatchSetScore
from app.models.progress_log import MatchProgressLog
from app.models.table import Table

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/reset-matches", dependencies=[Depends(require_admin)])
def reset_matches(db: Session = Depends(get_db)) -> dict[str, int]:
    """Delete all matches (and their children) and put every table back to idle.

    Preserves: tables, tournaments, main desks, schedule docs, referees text.
    """
    match_count = db.query(Match).count()

    # Break table -> match FK, and reset status in one update.
    db.query(Table).update(
        {Table.current_match_id: None, Table.status: "idle"},
        synchronize_session=False,
    )

    # SQLite's ON DELETE CASCADE requires PRAGMA foreign_keys=ON (off by default),
    # so clear the children explicitly to avoid orphans.
    db.query(MatchSetScore).delete(synchronize_session=False)
    db.query(MatchRefereeAssignment).delete(synchronize_session=False)
    db.query(MatchProgressLog).delete(synchronize_session=False)

    db.query(Match).delete(synchronize_session=False)
    db.commit()

    return {"deleted_matches": match_count}
