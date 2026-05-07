from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import TodoTask

router = APIRouter(prefix="/api/todos", tags=["todos"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=List[schemas.TodoOut])
def list_todos(db: Session = Depends(get_db)):
    return db.query(TodoTask).order_by(TodoTask.done, TodoTask.due_date.is_(None), TodoTask.due_date, TodoTask.id.desc()).all()


@router.post("", response_model=schemas.TodoOut, status_code=201)
def create_todo(payload: schemas.TodoIn, db: Session = Depends(get_db)):
    t = TodoTask(**payload.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/{todo_id}", response_model=schemas.TodoOut)
def update_todo(todo_id: int, payload: schemas.TodoIn, db: Session = Depends(get_db)):
    t = db.query(TodoTask).filter(TodoTask.id == todo_id).first()
    if not t:
        raise HTTPException(404, "Tâche introuvable")
    for k, v in payload.model_dump().items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{todo_id}", status_code=204)
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    t = db.query(TodoTask).filter(TodoTask.id == todo_id).first()
    if not t:
        raise HTTPException(404, "Tâche introuvable")
    db.delete(t)
    db.commit()
