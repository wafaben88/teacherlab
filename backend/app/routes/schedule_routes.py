from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session, joinedload

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import ScheduleEvent

router = APIRouter(prefix="/api/schedule", tags=["schedule"], dependencies=[Depends(get_current_user)])


def _expanded_events(events: List[ScheduleEvent]):
    """Yield virtual occurrences from recurring events."""
    out = []
    for ev in events:
        out.append(ev)
        if ev.recurrence_weeks and ev.recurrence_weeks > 0:
            for w in range(1, ev.recurrence_weeks + 1):
                # We don't persist children; we mutate a copy-like dict via SQLAlchemy detached object
                clone = ScheduleEvent(
                    id=ev.id * 1000 + w,
                    title=ev.title,
                    description=ev.description,
                    event_type=ev.event_type,
                    class_id=ev.class_id,
                    subject_id=ev.subject_id,
                    start_time=ev.start_time + timedelta(weeks=w),
                    end_time=ev.end_time + timedelta(weeks=w),
                    room=ev.room,
                    color=ev.color,
                    recurrence_weeks=0,
                    reminder_minutes=ev.reminder_minutes,
                )
                clone.school_class = ev.school_class
                clone.subject = ev.subject
                out.append(clone)
    out.sort(key=lambda e: e.start_time)
    return out


@router.get("", response_model=List[schemas.ScheduleEventOut])
def list_events(
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    class_id: Optional[int] = None,
    expand: bool = True,
    db: Session = Depends(get_db),
):
    q = db.query(ScheduleEvent).options(
        joinedload(ScheduleEvent.school_class),
        joinedload(ScheduleEvent.subject),
    )
    if class_id is not None:
        q = q.filter(ScheduleEvent.class_id == class_id)
    rows = q.order_by(ScheduleEvent.start_time).all()
    if expand:
        rows = _expanded_events(rows)
    if start is not None:
        rows = [r for r in rows if r.end_time >= start]
    if end is not None:
        rows = [r for r in rows if r.start_time <= end]
    return rows


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
    base = (
        db.query(ScheduleEvent)
        .options(
            joinedload(ScheduleEvent.school_class),
            joinedload(ScheduleEvent.subject),
        )
        .order_by(ScheduleEvent.start_time)
        .all()
    )
    rows = _expanded_events(base)
    rows = [r for r in rows if r.end_time >= now]
    return rows[:limit]


def _ical_escape(s: str) -> str:
    return (
        (s or "")
        .replace("\\", "\\\\")
        .replace(",", "\\,")
        .replace(";", "\\;")
        .replace("\n", "\\n")
    )


@router.get("/calendar.ics")
def calendar_ics(class_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(ScheduleEvent).options(
        joinedload(ScheduleEvent.school_class),
        joinedload(ScheduleEvent.subject),
    )
    if class_id is not None:
        q = q.filter(ScheduleEvent.class_id == class_id)
    rows = q.order_by(ScheduleEvent.start_time).all()
    rows = _expanded_events(rows)

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Teacher Hub//FR",
        "CALSCALE:GREGORIAN",
    ]
    for ev in rows:
        uid = f"event-{ev.id}@teacher-hub"
        dtstamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        dtstart = ev.start_time.strftime("%Y%m%dT%H%M%SZ")
        dtend = ev.end_time.strftime("%Y%m%dT%H%M%SZ")
        summary = ev.title
        if ev.school_class:
            summary = f"{ev.title} ({ev.school_class.name})"
        location = ev.room or ""
        description = ev.description or ""
        lines += [
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{dtstamp}",
            f"DTSTART:{dtstart}",
            f"DTEND:{dtend}",
            f"SUMMARY:{_ical_escape(summary)}",
            f"DESCRIPTION:{_ical_escape(description)}",
            f"LOCATION:{_ical_escape(location)}",
        ]
        if ev.reminder_minutes and ev.reminder_minutes > 0:
            lines += [
                "BEGIN:VALARM",
                "ACTION:DISPLAY",
                f"DESCRIPTION:{_ical_escape(summary)}",
                f"TRIGGER:-PT{int(ev.reminder_minutes)}M",
                "END:VALARM",
            ]
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    body = "\r\n".join(lines) + "\r\n"
    return Response(
        content=body,
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=teacher-hub.ics"},
    )
