from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import Competency, CompetencyAssessment, Student

router = APIRouter(
    prefix="/api/competencies",
    tags=["competencies"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=List[schemas.CompetencyOut])
def list_competencies(
    level_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Competency).options(
        joinedload(Competency.level), joinedload(Competency.subject)
    )
    if level_id is not None:
        q = q.filter(Competency.level_id == level_id)
    if subject_id is not None:
        q = q.filter(Competency.subject_id == subject_id)
    return q.order_by(Competency.code, Competency.name).all()


@router.post("", response_model=schemas.CompetencyOut, status_code=201)
def create_competency(payload: schemas.CompetencyIn, db: Session = Depends(get_db)):
    c = Competency(**payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.put("/{competency_id}", response_model=schemas.CompetencyOut)
def update_competency(
    competency_id: int, payload: schemas.CompetencyIn, db: Session = Depends(get_db)
):
    c = db.query(Competency).filter(Competency.id == competency_id).first()
    if not c:
        raise HTTPException(404, "Compétence introuvable")
    for k, v in payload.model_dump().items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{competency_id}", status_code=204)
def delete_competency(competency_id: int, db: Session = Depends(get_db)):
    c = db.query(Competency).filter(Competency.id == competency_id).first()
    if not c:
        raise HTTPException(404, "Compétence introuvable")
    db.delete(c)
    db.commit()


@router.get("/assessments", response_model=List[schemas.CompetencyAssessmentOut])
def list_assessments(
    student_id: Optional[int] = None,
    competency_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(CompetencyAssessment).options(
        joinedload(CompetencyAssessment.competency)
    )
    if student_id is not None:
        q = q.filter(CompetencyAssessment.student_id == student_id)
    if competency_id is not None:
        q = q.filter(CompetencyAssessment.competency_id == competency_id)
    return q.order_by(CompetencyAssessment.date.desc()).all()


@router.post("/assessments", response_model=schemas.CompetencyAssessmentOut, status_code=201)
def create_assessment(
    payload: schemas.CompetencyAssessmentIn, db: Session = Depends(get_db)
):
    if not db.query(Student).filter(Student.id == payload.student_id).first():
        raise HTTPException(404, "Élève introuvable")
    if not db.query(Competency).filter(Competency.id == payload.competency_id).first():
        raise HTTPException(404, "Compétence introuvable")
    data = payload.model_dump()
    if data.get("date") is None:
        data["date"] = datetime.utcnow()
    a = CompetencyAssessment(**data)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/assessments/{assessment_id}", status_code=204)
def delete_assessment(assessment_id: int, db: Session = Depends(get_db)):
    a = db.query(CompetencyAssessment).filter(CompetencyAssessment.id == assessment_id).first()
    if not a:
        raise HTTPException(404, "Évaluation introuvable")
    db.delete(a)
    db.commit()
