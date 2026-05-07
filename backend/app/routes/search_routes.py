from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import Exercise, FileItem, SchoolClass, ScheduleEvent

router = APIRouter(
    prefix="/api/search",
    tags=["search"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=schemas.SearchPayload)
def global_search(
    q: Optional[str] = Query(None, min_length=1, max_length=120),
    limit: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_db),
):
    if not q:
        return schemas.SearchPayload(files=[], exercises=[], classes=[], schedule=[])

    like = f"%{q.strip()}%"

    files = (
        db.query(FileItem)
        .options(joinedload(FileItem.level), joinedload(FileItem.subject))
        .filter(
            or_(
                FileItem.title.ilike(like),
                FileItem.description.ilike(like),
                FileItem.tags.ilike(like),
                FileItem.original_name.ilike(like),
            )
        )
        .order_by(FileItem.created_at.desc())
        .limit(limit)
        .all()
    )

    exercises = (
        db.query(Exercise)
        .options(joinedload(Exercise.level), joinedload(Exercise.subject))
        .filter(
            or_(
                Exercise.title.ilike(like),
                Exercise.statement.ilike(like),
                Exercise.tags.ilike(like),
            )
        )
        .order_by(Exercise.created_at.desc())
        .limit(limit)
        .all()
    )

    classes = (
        db.query(SchoolClass)
        .options(joinedload(SchoolClass.level))
        .filter(
            or_(
                SchoolClass.name.ilike(like),
                SchoolClass.notes.ilike(like),
                SchoolClass.school_year.ilike(like),
            )
        )
        .order_by(SchoolClass.name)
        .limit(limit)
        .all()
    )

    schedule = (
        db.query(ScheduleEvent)
        .options(
            joinedload(ScheduleEvent.school_class),
            joinedload(ScheduleEvent.subject),
        )
        .filter(
            or_(
                ScheduleEvent.title.ilike(like),
                ScheduleEvent.description.ilike(like),
                ScheduleEvent.room.ilike(like),
            )
        )
        .order_by(ScheduleEvent.start_time.desc())
        .limit(limit)
        .all()
    )

    return schemas.SearchPayload(
        files=[schemas.FileOut.model_validate(f) for f in files],
        exercises=[schemas.ExerciseOut.model_validate(e) for e in exercises],
        classes=[schemas.SchoolClassOut.model_validate(c) for c in classes],
        schedule=[schemas.ScheduleEventOut.model_validate(s) for s in schedule],
    )
