from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app import models  # noqa: F401  ensure model classes are registered with Base
from app.models.announcement import ScheduleAnnouncement
from app.models.participant import Participant
from app.models.stage import Stage
from app.models.team import Team
from app.models.tournament import Tournament

UPLOAD_ROOT = Path(settings.upload_root).resolve()


def _migrate_sqlite() -> None:
    """Lightweight inline migrations for SQLite. Adds new columns when missing."""
    if not settings.database_url.startswith("sqlite"):
        return
    additions: dict[str, list[tuple[str, str]]] = {
        "tables": [
            ("call_side", "VARCHAR(8)"),
            ("call_player_name", "TEXT"),
            ("call_created_at", "DATETIME"),
            ("call_broadcasted_at", "DATETIME"),
        ],
        "participants": [
            ("pair_no", "INTEGER"),
            ("checked_in", "INTEGER NOT NULL DEFAULT 0"),
            ("checked_in_at", "DATETIME"),
            ("student_id", "VARCHAR(50)"),
        ],
        "matches": [
            ("match_kind", "VARCHAR(16) NOT NULL DEFAULT 'singles'"),
            ("team_a_id", "INTEGER"),
            ("team_b_id", "INTEGER"),
            ("winner_team_id", "INTEGER"),
        ],
        # Phase 1: Stage FK on category-bearing tables. Backfilled on startup.
        "teams": [("stage_id", "INTEGER")],
        "schedule_announcements": [("stage_id", "INTEGER")],
    }
    # Note: participants already has `stage_id` added below via a separate list.
    additions["participants"].append(("stage_id", "INTEGER"))
    with engine.begin() as conn:
        for table_name, cols in additions.items():
            existing = {row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table_name})").fetchall()}
            for col_name, col_type in cols:
                if col_name not in existing:
                    conn.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}")


# Mapping from legacy enum values → Stage.name.
# Used to seed default Stages and backfill stage_id on existing rows (Phase 1 of
# the categories-as-Stage refactor). Keep in sync with the enums until Phase 4.
_STAGE_SEED_ORDER = [
    "公開男單",
    "公開女單",
    "歡樂雙打",
    "公開男團",
    "公開女團",
]
_PARTICIPANT_CATEGORY_TO_STAGE = {
    "men_singles": "公開男單",
    "women_singles": "公開女單",
    "doubles": "歡樂雙打",
}
_TEAM_DIVISION_TO_STAGE = {
    "men": "公開男團",
    "women": "公開女團",
}


def _seed_stages_and_backfill() -> None:
    """Ensure default Stages exist and backfill legacy enum → stage_id links.

    Runs on every startup but is idempotent: only creates missing Stages and
    only fills rows whose stage_id is null.
    """
    with SessionLocal() as db:
        tournament = db.query(Tournament).order_by(Tournament.id.asc()).first()
        if not tournament:
            return  # nothing to seed until an admin creates a tournament

        # Seed defaults only on very first run (when NO stages exist yet).
        # Once the admin manages their own stages, we don't re-create deleted ones.
        stage_count = db.query(Stage).filter(Stage.tournament_id == tournament.id).count()
        if stage_count == 0:
            for order, name in enumerate(_STAGE_SEED_ORDER):
                db.add(
                    Stage(
                        tournament_id=tournament.id,
                        name=name,
                        stage_type="round_robin",
                        sort_order=order,
                    )
                )
            db.commit()

        stage_by_name = {
            s.name: s
            for s in db.query(Stage).filter(Stage.tournament_id == tournament.id).all()
        }

        # Backfill Participant.stage_id from category.
        for cat, stage_name in _PARTICIPANT_CATEGORY_TO_STAGE.items():
            stage = stage_by_name.get(stage_name)
            if not stage:
                continue
            db.query(Participant).filter(
                Participant.tournament_id == tournament.id,
                Participant.category == cat,
                Participant.stage_id.is_(None),
            ).update({Participant.stage_id: stage.id}, synchronize_session=False)

        # Backfill Team.stage_id from division.
        for div, stage_name in _TEAM_DIVISION_TO_STAGE.items():
            stage = stage_by_name.get(stage_name)
            if not stage:
                continue
            db.query(Team).filter(
                Team.tournament_id == tournament.id,
                Team.division == div,
                Team.stage_id.is_(None),
            ).update({Team.stage_id: stage.id}, synchronize_session=False)

        # Backfill ScheduleAnnouncement.stage_id from title (only when title
        # matches a stage name exactly; "時間表" and any freeform titles stay null).
        for stage_name, stage in stage_by_name.items():
            db.query(ScheduleAnnouncement).filter(
                ScheduleAnnouncement.tournament_id == tournament.id,
                ScheduleAnnouncement.title == stage_name,
                ScheduleAnnouncement.stage_id.is_(None),
            ).update({ScheduleAnnouncement.stage_id: stage.id}, synchronize_session=False)

        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate_sqlite()
    _seed_stages_and_backfill()
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")

app.include_router(api_router, prefix=settings.api_v1_prefix)
