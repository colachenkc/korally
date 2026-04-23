from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import require_admin
from app.models.main_desk import MainDesk
from app.schemas.main_desk import MainDeskRead, MainDeskUpdate

router = APIRouter(prefix="/main-desk", tags=["main-desk"])


@router.get("", response_model=list[MainDeskRead])
def list_main_desks(db: Session = Depends(get_db)) -> list[MainDesk]:
    return db.query(MainDesk).order_by(MainDesk.id.asc()).all()


@router.patch(
    "/{desk_id}",
    response_model=MainDeskRead,
    dependencies=[Depends(require_admin)],
)
def update_main_desk(desk_id: int, payload: MainDeskUpdate, db: Session = Depends(get_db)) -> MainDesk:
    desk = db.get(MainDesk, desk_id)
    if not desk:
        raise HTTPException(status_code=404, detail="Main desk not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(desk, field, value)
    db.commit()
    db.refresh(desk)
    return desk
