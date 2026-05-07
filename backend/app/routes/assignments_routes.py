from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import Assignment, SchoolClass, Student, Submission

router = APIRouter(
    prefix="/api/assignments",
    tags=["assignments"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=List[schemas.AssignmentOut])
def list_assignments(class_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Assignment).options(joinedload(Assignment.subject))
    if class_id is not None:
        q = q.filter(Assignment.class_id == class_id)
    return q.order_by(Assignment.due_date.desc().nullslast()).all()


@router.post("", response_model=schemas.AssignmentOut, status_code=201)
def create_assignment(payload: schemas.AssignmentIn, db: Session = Depends(get_db)):
    if not db.query(SchoolClass).filter(SchoolClass.id == payload.class_id).first():
        raise HTTPException(404, "Classe introuvable")
    a = Assignment(**payload.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)

    # Auto-create pending submissions for each student in the class
    students = db.query(Student).filter(Student.class_id == payload.class_id).all()
    for s in students:
        db.add(Submission(assignment_id=a.id, student_id=s.id, status="pending"))
    db.commit()

    return a


@router.put("/{assignment_id}", response_model=schemas.AssignmentOut)
def update_assignment(
    assignment_id: int, payload: schemas.AssignmentIn, db: Session = Depends(get_db)
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Devoir introuvable")
    for k, v in payload.model_dump().items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{assignment_id}", status_code=204)
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(404, "Devoir introuvable")
    db.delete(a)
    db.commit()


@router.get("/{assignment_id}/submissions", response_model=List[schemas.SubmissionOut])
def list_submissions(assignment_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Submission)
        .options(joinedload(Submission.student))
        .filter(Submission.assignment_id == assignment_id)
        .order_by(Submission.id)
        .all()
    )


@router.put("/submissions/{submission_id}", response_model=schemas.SubmissionOut)
def update_submission(
    submission_id: int, payload: schemas.SubmissionIn, db: Session = Depends(get_db)
):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(404, "Soumission introuvable")
    for k, v in payload.model_dump().items():
        setattr(sub, k, v)
    db.commit()
    db.refresh(sub)
    return sub
