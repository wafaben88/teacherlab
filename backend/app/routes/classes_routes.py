from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import SchoolClass

router = APIRouter(prefix="/api/classes", tags=["classes"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=List[schemas.ClassOut])
def list_classes(level_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(SchoolClass).options(joinedload(SchoolClass.level))
    if level_id is not None:
        q = q.filter(SchoolClass.level_id == level_id)
    return q.order_by(SchoolClass.name).all()


@router.post("", response_model=schemas.ClassOut, status_code=201)
def create_class(payload: schemas.ClassIn, db: Session = Depends(get_db)):
    cls = SchoolClass(**payload.model_dump())
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls


@router.put("/{class_id}", response_model=schemas.ClassOut)
def update_class(class_id: int, payload: schemas.ClassIn, db: Session = Depends(get_db)):
    cls = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()
    if not cls:
        raise HTTPException(404, "Classe introuvable")
    for k, v in payload.model_dump().items():
        setattr(cls, k, v)
    db.commit()
    db.refresh(cls)
    return cls


@router.delete("/{class_id}", status_code=204)
def delete_class(class_id: int, db: Session = Depends(get_db)):
    cls = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()
    if not cls:
        raise HTTPException(404, "Classe introuvable")
    db.delete(cls)
    db.commit()
