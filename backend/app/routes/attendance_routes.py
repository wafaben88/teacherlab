from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import Attendance, SchoolClass, Student

router = APIRouter(
    prefix="/api/attendance",
    tags=["attendance"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=List[schemas.AttendanceOut])
def list_attendance(
    class_id: Optional[int] = None,
    student_id: Optional[int] = None,
    event_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Attendance).options(joinedload(Attendance.student))
    if class_id is not None:
        q = q.filter(Attendance.class_id == class_id)
    if student_id is not None:
        q = q.filter(Attendance.student_id == student_id)
    if event_id is not None:
        q = q.filter(Attendance.event_id == event_id)
    if date_from is not None:
        q = q.filter(Attendance.date >= date_from)
    if date_to is not None:
        q = q.filter(Attendance.date <= date_to)
    return q.order_by(Attendance.date.desc()).all()


@router.post("", response_model=schemas.AttendanceOut, status_code=201)
def record_attendance(payload: schemas.AttendanceIn, db: Session = Depends(get_db)):
    if not db.query(Student).filter(Student.id == payload.student_id).first():
        raise HTTPException(404, "Élève introuvable")
    a = Attendance(**payload.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.post("/bulk", response_model=List[schemas.AttendanceOut])
def record_bulk(payload: schemas.AttendanceBulkIn, db: Session = Depends(get_db)):
    if not db.query(SchoolClass).filter(SchoolClass.id == payload.class_id).first():
        raise HTTPException(404, "Classe introuvable")
    created: List[Attendance] = []
    for entry in payload.entries:
        a = Attendance(
            class_id=payload.class_id,
            event_id=payload.event_id,
            date=payload.date,
            student_id=entry.student_id,
            status=entry.status,
            notes=entry.notes or "",
        )
        db.add(a)
        created.append(a)
    db.commit()
    for a in created:
        db.refresh(a)
    return created


@router.put("/{attendance_id}", response_model=schemas.AttendanceOut)
def update_attendance(
    attendance_id: int, payload: schemas.AttendanceIn, db: Session = Depends(get_db)
):
    a = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not a:
        raise HTTPException(404, "Entrée introuvable")
    for k, v in payload.model_dump().items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{attendance_id}", status_code=204)
def delete_attendance(attendance_id: int, db: Session = Depends(get_db)):
    a = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not a:
        raise HTTPException(404, "Entrée introuvable")
    db.delete(a)
    db.commit()
