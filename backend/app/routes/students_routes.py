import csv
import io
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import SchoolClass, Student

router = APIRouter(
    prefix="/api/students",
    tags=["students"],
    dependencies=[Depends(get_current_user)],
)


def _refresh_count(db: Session, class_id: int) -> None:
    cls = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()
    if cls:
        cls.student_count = db.query(Student).filter(Student.class_id == class_id).count()
        db.commit()


@router.get("", response_model=List[schemas.StudentOut])
def list_students(class_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Student)
    if class_id is not None:
        q = q.filter(Student.class_id == class_id)
    return q.order_by(Student.last_name, Student.first_name).all()


@router.post("", response_model=schemas.StudentOut, status_code=201)
def create_student(payload: schemas.StudentIn, db: Session = Depends(get_db)):
    if not db.query(SchoolClass).filter(SchoolClass.id == payload.class_id).first():
        raise HTTPException(404, "Classe introuvable")
    s = Student(**payload.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    _refresh_count(db, payload.class_id)
    return s


@router.put("/{student_id}", response_model=schemas.StudentOut)
def update_student(
    student_id: int, payload: schemas.StudentIn, db: Session = Depends(get_db)
):
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(404, "Élève introuvable")
    for k, v in payload.model_dump().items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    _refresh_count(db, payload.class_id)
    return s


@router.delete("/{student_id}", status_code=204)
def delete_student(student_id: int, db: Session = Depends(get_db)):
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(404, "Élève introuvable")
    class_id = s.class_id
    db.delete(s)
    db.commit()
    _refresh_count(db, class_id)


@router.post("/import", response_model=List[schemas.StudentOut])
async def import_csv(
    class_id: int,
    upload: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not db.query(SchoolClass).filter(SchoolClass.id == class_id).first():
        raise HTTPException(404, "Classe introuvable")
    raw = await upload.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1", errors="ignore")

    sniffer = csv.Sniffer()
    sample = text[:1024]
    try:
        dialect = sniffer.sniff(sample, delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(text), dialect=dialect)

    created: List[Student] = []
    headers = {h.lower().strip(): h for h in (reader.fieldnames or [])}

    def pick(row: dict, *keys: str) -> str:
        for k in keys:
            if k in headers:
                return (row.get(headers[k]) or "").strip()
        return ""

    for row in reader:
        first = pick(row, "first_name", "prenom", "prénom", "first")
        last = pick(row, "last_name", "nom", "last")
        if not first and not last:
            full = pick(row, "name", "nom complet", "full_name", "fullname")
            if full:
                parts = full.split()
                first = parts[0]
                last = " ".join(parts[1:]) if len(parts) > 1 else ""
        if not (first or last):
            continue
        email = pick(row, "email", "mail")
        parent = pick(row, "parent_email", "email_parent", "parent")
        notes = pick(row, "notes", "remarques")
        student = Student(
            class_id=class_id,
            first_name=first or "",
            last_name=last or "",
            email=email,
            parent_email=parent,
            notes=notes,
        )
        db.add(student)
        created.append(student)
    db.commit()
    for s in created:
        db.refresh(s)
    _refresh_count(db, class_id)
    return created
