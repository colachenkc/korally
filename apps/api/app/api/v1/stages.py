from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import require_admin
from app.models.group import Group
from app.models.stage import Stage
from app.models.tournament import Tournament
from app.schemas.stage import StageCreate, StageRead, StageUpdate

router = APIRouter(prefix="/stages", tags=["stages"])


def _resolve_tournament_id(db: Session, tournament_id: int | None) -> int:
    if tournament_id is not None:
        if not db.get(Tournament, tournament_id):
            raise HTTPException(status_code=404, detail="Tournament not found")
        return tournament_id
    first = db.query(Tournament).order_by(Tournament.id.asc()).first()
    if not first:
        raise HTTPException(status_code=400, detail="No tournament exists yet")
    return first.id


@router.get("", response_model=list[StageRead])
def list_stages(db: Session = Depends(get_db)) -> list[Stage]:
    return db.query(Stage).order_by(Stage.sort_order.asc(), Stage.id.asc()).all()


@router.post(
    "",
    response_model=StageRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_stage(payload: StageCreate, db: Session = Depends(get_db)) -> Stage:
    tournament_id = _resolve_tournament_id(db, payload.tournament_id)
    stage = Stage(
        tournament_id=tournament_id,
        name=payload.name.strip(),
        stage_type=payload.stage_type or "round_robin",
        sort_order=payload.sort_order,
        description=payload.description,
    )
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return stage


@router.patch(
    "/{stage_id}",
    response_model=StageRead,
    dependencies=[Depends(require_admin)],
)
def update_stage(stage_id: int, payload: StageUpdate, db: Session = Depends(get_db)) -> Stage:
    stage = db.get(Stage, stage_id)
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and isinstance(data["name"], str):
        data["name"] = data["name"].strip() or stage.name
    for field, value in data.items():
        setattr(stage, field, value)
    db.commit()
    db.refresh(stage)
    return stage


@router.delete(
    "/{stage_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_stage(stage_id: int, db: Session = Depends(get_db)) -> None:
    stage = db.get(Stage, stage_id)
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    # Break Group.stage_id back-refs (SQLite may not enforce SET NULL cascade).
    db.query(Group).filter(Group.stage_id == stage_id).update(
        {Group.stage_id: None},
        synchronize_session=False,
    )
    db.delete(stage)
    db.commit()
