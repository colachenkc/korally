from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import require_admin
from app.core.config import settings
from app.models.announcement import ScheduleAnnouncement
from app.models.stage import Stage
from app.models.tournament import Tournament
from app.schemas.announcement import ScheduleAnnouncementRead

router = APIRouter(prefix="/schedule-docs", tags=["schedule-docs"])

UPLOAD_ROOT = Path(settings.upload_root).resolve()
SCHEDULE_DIR = UPLOAD_ROOT / "schedule"
MAX_PDF_BYTES = 20 * 1024 * 1024

ALLOWED_CATEGORIES = {"時間表", "公開男單", "公開女單", "公開男團", "公開女團", "歡樂雙打"}


def _resolve_tournament_id(db: Session, tournament_id: int | None) -> int:
    if tournament_id is not None:
        if not db.get(Tournament, tournament_id):
            raise HTTPException(status_code=404, detail="Tournament not found")
        return tournament_id
    first = db.query(Tournament).order_by(Tournament.id.asc()).first()
    if not first:
        raise HTTPException(status_code=400, detail="No tournament exists yet")
    return first.id


def _remove_pdf_file(pdf_url: str | None) -> None:
    if not pdf_url or not pdf_url.startswith("/uploads/"):
        return
    path = UPLOAD_ROOT / Path(pdf_url).relative_to("/uploads")
    path.unlink(missing_ok=True)


@router.get("", response_model=list[ScheduleAnnouncementRead])
def list_schedule_docs(
    tournament_id: int | None = None, db: Session = Depends(get_db)
) -> list[ScheduleAnnouncement]:
    tid = _resolve_tournament_id(db, tournament_id)
    return (
        db.query(ScheduleAnnouncement)
        .filter(ScheduleAnnouncement.tournament_id == tid)
        .order_by(ScheduleAnnouncement.id.asc())
        .all()
    )


@router.post(
    "",
    response_model=ScheduleAnnouncementRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
async def upload_schedule_doc(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    stage_id: int | None = Form(default=None),
    tournament_id: int | None = Form(default=None),
    db: Session = Depends(get_db),
) -> ScheduleAnnouncement:
    tid = _resolve_tournament_id(db, tournament_id)

    resolved_stage: Stage | None = None
    if stage_id is not None:
        resolved_stage = db.get(Stage, stage_id)
        if not resolved_stage:
            raise HTTPException(status_code=400, detail="stage_id refers to unknown stage")
        # Stage picker is the source of truth for the title when provided.
        title = resolved_stage.name
    elif title:
        # Legacy path: accept "時間表" and the 5 fixed categories.
        if title not in ALLOWED_CATEGORIES:
            raise HTTPException(
                status_code=400,
                detail=f"title must be one of {sorted(ALLOWED_CATEGORIES)} or supply stage_id",
            )
        # Best-effort: if a Stage with this exact name exists, link it.
        resolved_stage = (
            db.query(Stage)
            .filter(Stage.tournament_id == tid, Stage.name == title)
            .first()
        )
    else:
        raise HTTPException(status_code=400, detail="Provide title or stage_id")

    if file.content_type not in ("application/pdf", "application/x-pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    data = await file.read()
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 20 MB)")

    # Replace any existing doc with the same title for this tournament
    existing = (
        db.query(ScheduleAnnouncement)
        .filter(
            ScheduleAnnouncement.tournament_id == tid,
            ScheduleAnnouncement.title == title,
        )
        .first()
    )
    if existing:
        _remove_pdf_file(existing.pdf_url)
        db.delete(existing)
        db.flush()

    SCHEDULE_DIR.mkdir(parents=True, exist_ok=True)
    file_id = f"{uuid4().hex}.pdf"
    (SCHEDULE_DIR / file_id).write_bytes(data)

    doc = ScheduleAnnouncement(
        tournament_id=tid,
        title=title,
        stage_id=resolved_stage.id if resolved_stage else None,
        pdf_url=f"/uploads/schedule/{file_id}",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete(
    "/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_schedule_doc(doc_id: int, db: Session = Depends(get_db)) -> None:
    doc = db.get(ScheduleAnnouncement, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Schedule doc not found")
    _remove_pdf_file(doc.pdf_url)
    db.delete(doc)
    db.commit()
