from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import ScheduleEvent

router = APIRouter(prefix="/api/schedule", tags=["schedule"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=List[schemas.ScheduleEventOut])
def list_events(
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    class_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(ScheduleEvent).options(
        joinedload(ScheduleEvent.school_class),
        joinedload(ScheduleEvent.subject),
    )
    if start is not None:
        q = q.filter(ScheduleEvent.end_time >= start)
    if end is not None:
        q = q.filter(ScheduleEvent.start_time <= end)
    if class_id is not None:
        q = q.filter(ScheduleEvent.class_id == class_id)
    return q.order_by(ScheduleEvent.start_time).all()


@router.post("", response_model=schemas.ScheduleEventOut, status_code=201)
def create_event(payload: schemas.ScheduleEventIn, db: Session = Depends(get_db)):
    if payload.end_time <= payload.start_time:
        raise HTTPException(400, "La date de fin doit être après la date de début")
    ev = ScheduleEvent(**payload.model_dump())
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


@router.put("/{event_id}", response_model=schemas.ScheduleEventOut)
def update_event(event_id: int, payload: schemas.ScheduleEventIn, db: Session = Depends(get_db)):
    ev = db.query(ScheduleEvent).filter(ScheduleEvent.id == event_id).first()
    if not ev:
        raise HTTPException(404, "Événement introuvable")
    if payload.end_time <= payload.start_time:
        raise HTTPException(400, "La date de fin doit être après la date de début")
    for k, v in payload.model_dump().items():
        setattr(ev, k, v)
    db.commit()
    db.refresh(ev)
    return ev


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int, db: Session = Depends(get_db)):
    ev = db.query(ScheduleEvent).filter(ScheduleEvent.id == event_id).first()
    if not ev:
        raise HTTPException(404, "Événement introuvable")
    db.delete(ev)
    db.commit()


@router.get("/upcoming", response_model=List[schemas.ScheduleEventOut])
def upcoming(limit: int = 5, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    return (
        db.query(ScheduleEvent)
        .options(
            joinedload(ScheduleEvent.school_class),
            joinedload(ScheduleEvent.subject),
        )
        .filter(ScheduleEvent.end_time >= now)
        .order_by(ScheduleEvent.start_time)
        .limit(limit)
        .all()
    )
