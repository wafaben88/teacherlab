from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import Resource

router = APIRouter(
    prefix="/api/resources",
    tags=["resources"],
    dependencies=[Depends(get_current_user)],
)


def _q(db: Session):
    return db.query(Resource).options(joinedload(Resource.level), joinedload(Resource.subject))


@router.get("", response_model=List[schemas.ResourceOut])
def list_resources(
    level_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    category: Optional[str] = None,
    favorite: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    q = _q(db)
    if level_id is not None:
        q = q.filter(Resource.level_id == level_id)
    if subject_id is not None:
        q = q.filter(Resource.subject_id == subject_id)
    if category:
        q = q.filter(Resource.category == category)
    if favorite is not None:
        q = q.filter(Resource.favorite == favorite)
    return q.order_by(Resource.favorite.desc(), Resource.created_at.desc()).all()


@router.post("", response_model=schemas.ResourceOut, status_code=201)
def create_resource(payload: schemas.ResourceIn, db: Session = Depends(get_db)):
    r = Resource(**payload.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.put("/{resource_id}", response_model=schemas.ResourceOut)
def update_resource(resource_id: int, payload: schemas.ResourceIn, db: Session = Depends(get_db)):
    r = db.query(Resource).filter(Resource.id == resource_id).first()
    if not r:
        raise HTTPException(404, "Ressource introuvable")
    for k, v in payload.model_dump().items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return r


@router.delete("/{resource_id}", status_code=204)
def delete_resource(resource_id: int, db: Session = Depends(get_db)):
    r = db.query(Resource).filter(Resource.id == resource_id).first()
    if not r:
        raise HTTPException(404, "Ressource introuvable")
    db.delete(r)
    db.commit()


@router.post("/{resource_id}/toggle-favorite", response_model=schemas.ResourceOut)
def toggle_favorite(resource_id: int, db: Session = Depends(get_db)):
    r = db.query(Resource).filter(Resource.id == resource_id).first()
    if not r:
        raise HTTPException(404, "Ressource introuvable")
    r.favorite = not r.favorite
    db.commit()
    db.refresh(r)
    return r
