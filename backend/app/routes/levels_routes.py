from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import Level, User

router = APIRouter(prefix="/api/levels", tags=["levels"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=List[schemas.LevelOut])
def list_levels(db: Session = Depends(get_db)):
    return db.query(Level).order_by(Level.sort_order, Level.id).all()


@router.post("", response_model=schemas.LevelOut, status_code=201)
def create_level(payload: schemas.LevelIn, db: Session = Depends(get_db)):
    level = Level(**payload.model_dump())
    db.add(level)
    db.commit()
    db.refresh(level)
    return level


@router.put("/{level_id}", response_model=schemas.LevelOut)
def update_level(level_id: int, payload: schemas.LevelIn, db: Session = Depends(get_db)):
    level = db.query(Level).filter(Level.id == level_id).first()
    if not level:
        raise HTTPException(404, "Niveau introuvable")
    for k, v in payload.model_dump().items():
        setattr(level, k, v)
    db.commit()
    db.refresh(level)
    return level


@router.delete("/{level_id}", status_code=204)
def delete_level(level_id: int, db: Session = Depends(get_db)):
    level = db.query(Level).filter(Level.id == level_id).first()
    if not level:
        raise HTTPException(404, "Niveau introuvable")
    db.delete(level)
    db.commit()
