from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import Subject

router = APIRouter(prefix="/api/subjects", tags=["subjects"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=List[schemas.SubjectOut])
def list_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).order_by(Subject.name).all()


@router.post("", response_model=schemas.SubjectOut, status_code=201)
def create_subject(payload: schemas.SubjectIn, db: Session = Depends(get_db)):
    if db.query(Subject).filter(Subject.name == payload.name).first():
        raise HTTPException(400, "Cette matière existe déjà")
    subj = Subject(**payload.model_dump())
    db.add(subj)
    db.commit()
    db.refresh(subj)
    return subj


@router.put("/{subject_id}", response_model=schemas.SubjectOut)
def update_subject(subject_id: int, payload: schemas.SubjectIn, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(404, "Matière introuvable")
    for k, v in payload.model_dump().items():
        setattr(subj, k, v)
    db.commit()
    db.refresh(subj)
    return subj


@router.delete("/{subject_id}", status_code=204)
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(404, "Matière introuvable")
    db.delete(subj)
    db.commit()
