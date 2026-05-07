from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import (
    Exercise,
    FileItem,
    Level,
    SchoolClass,
    ScheduleEvent,
    TodoTask,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])


@router.get("/stats", response_model=schemas.DashboardStats)
def stats(db: Session = Depends(get_db)):
    files_count = db.query(func.count(FileItem.id)).scalar() or 0
    exercises_count = db.query(func.count(Exercise.id)).scalar() or 0
    classes_count = db.query(func.count(SchoolClass.id)).scalar() or 0

    now = datetime.utcnow()
    upcoming_events = (
        db.query(func.count(ScheduleEvent.id))
        .filter(ScheduleEvent.end_time >= now)
        .scalar()
    ) or 0

    storage_total = db.query(func.coalesce(func.sum(FileItem.size_bytes), 0)).scalar() or 0
    storage_mb = round(storage_total / (1024 * 1024), 2)

    by_kind_rows = (
        db.query(FileItem.kind, func.count(FileItem.id))
        .group_by(FileItem.kind)
        .all()
    )
    files_by_kind = {kind: count for kind, count in by_kind_rows}

    by_level_rows = (
        db.query(Level.id, Level.name, Level.color, func.count(FileItem.id))
        .outerjoin(FileItem, FileItem.level_id == Level.id)
        .group_by(Level.id)
        .order_by(Level.sort_order)
        .all()
    )
    files_by_level = [
        {"id": lid, "name": name, "color": color, "count": count}
        for lid, name, color, count in by_level_rows
    ]

    next_events: List[ScheduleEvent] = (
        db.query(ScheduleEvent)
        .options(
            joinedload(ScheduleEvent.school_class),
            joinedload(ScheduleEvent.subject),
        )
        .filter(ScheduleEvent.end_time >= now)
        .order_by(ScheduleEvent.start_time)
        .limit(5)
        .all()
    )

    pending_todos = (
        db.query(func.count(TodoTask.id))
        .filter(TodoTask.done.is_(False))
        .scalar()
    ) or 0

    return schemas.DashboardStats(
        files_count=files_count,
        exercises_count=exercises_count,
        classes_count=classes_count,
        upcoming_events=upcoming_events,
        storage_used_mb=storage_mb,
        files_by_kind=files_by_kind,
        files_by_level=files_by_level,
        next_events=[schemas.ScheduleEventOut.model_validate(e) for e in next_events],
        pending_todos=pending_todos,
    )
