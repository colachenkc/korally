from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings
from app.core.database import Base, engine
from app import models  # noqa: F401  ensure model classes are registered with Base

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
    }
    with engine.begin() as conn:
        for table_name, cols in additions.items():
            existing = {row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table_name})").fetchall()}
            for col_name, col_type in cols:
                if col_name not in existing:
                    conn.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate_sqlite()
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
