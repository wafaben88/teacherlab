from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import Grade

router = APIRouter(prefix="/api/grades", tags=["grades"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=List[schemas.GradeOut])
def list_grades(
    class_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Grade).options(
        joinedload(Grade.school_class),
        joinedload(Grade.subject),
    )
    if class_id is not None:
        q = q.filter(Grade.class_id == class_id)
    if subject_id is not None:
        q = q.filter(Grade.subject_id == subject_id)
    return q.order_by(Grade.date.desc()).all()


@router.post("", response_model=schemas.GradeOut, status_code=201)
def create_grade(payload: schemas.GradeIn, db: Session = Depends(get_db)):
    data = payload.model_dump()
    if not data.get("date"):
        data["date"] = datetime.utcnow()
    g = Grade(**data)
    db.add(g)
    db.commit()
    db.refresh(g)
    return g


@router.put("/{grade_id}", response_model=schemas.GradeOut)
def update_grade(grade_id: int, payload: schemas.GradeIn, db: Session = Depends(get_db)):
    g = db.query(Grade).filter(Grade.id == grade_id).first()
    if not g:
        raise HTTPException(404, "Note introuvable")
    data = payload.model_dump()
    if not data.get("date"):
        data["date"] = g.date
    for k, v in data.items():
        setattr(g, k, v)
    db.commit()
    db.refresh(g)
    return g


@router.delete("/{grade_id}", status_code=204)
def delete_grade(grade_id: int, db: Session = Depends(get_db)):
    g = db.query(Grade).filter(Grade.id == grade_id).first()
    if not g:
        raise HTTPException(404, "Note introuvable")
    db.delete(g)
    db.commit()
