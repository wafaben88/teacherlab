from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import Exercise

router = APIRouter(prefix="/api/exercises", tags=["exercises"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=List[schemas.ExerciseOut])
def list_exercises(
    level_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Exercise).options(
        joinedload(Exercise.level),
        joinedload(Exercise.subject),
        joinedload(Exercise.file),
    )
    if level_id is not None:
        q = q.filter(Exercise.level_id == level_id)
    if subject_id is not None:
        q = q.filter(Exercise.subject_id == subject_id)
    if difficulty:
        q = q.filter(Exercise.difficulty == difficulty)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(
            Exercise.title.ilike(like),
            Exercise.statement.ilike(like),
            Exercise.tags.ilike(like),
        ))
    return q.order_by(Exercise.created_at.desc()).all()


@router.post("", response_model=schemas.ExerciseOut, status_code=201)
def create_exercise(payload: schemas.ExerciseIn, db: Session = Depends(get_db)):
    ex = Exercise(**payload.model_dump())
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex


@router.get("/{exercise_id}", response_model=schemas.ExerciseOut)
def get_exercise(exercise_id: int, db: Session = Depends(get_db)):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(404, "Exercice introuvable")
    return ex


@router.put("/{exercise_id}", response_model=schemas.ExerciseOut)
def update_exercise(exercise_id: int, payload: schemas.ExerciseIn, db: Session = Depends(get_db)):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(404, "Exercice introuvable")
    for k, v in payload.model_dump().items():
        setattr(ex, k, v)
    db.commit()
    db.refresh(ex)
    return ex


@router.delete("/{exercise_id}", status_code=204)
def delete_exercise(exercise_id: int, db: Session = Depends(get_db)):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(404, "Exercice introuvable")
    db.delete(ex)
    db.commit()
