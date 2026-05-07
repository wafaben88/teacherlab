"""Library / shared content : expose all items flagged is_template or is_shared
and provide a clone endpoint that copies a template into the user's collection."""

from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from ..auth import get_current_user
from ..database import get_db
from ..models import Exercise, FileItem, Quiz, QuizChoice, QuizQuestion, Rubric, RubricCriterion

router = APIRouter(
    prefix="/api/library",
    tags=["library"],
    dependencies=[Depends(get_current_user)],
)


class LibraryItem(BaseModel):
    type: Literal["file", "exercise", "quiz", "rubric"]
    id: int
    title: str
    description: str = ""
    is_template: bool = False
    is_shared: bool = False
    level_id: Optional[int] = None
    subject_id: Optional[int] = None


@router.get("", response_model=List[LibraryItem])
def list_library(
    only_templates: bool = False,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    items: List[LibraryItem] = []

    def add(rows, kind: str, title_attr: str, desc_attr: str | None = None):
        for r in rows:
            items.append(
                LibraryItem(
                    type=kind,
                    id=r.id,
                    title=getattr(r, title_attr) or "",
                    description=(getattr(r, desc_attr) or "") if desc_attr else "",
                    is_template=bool(getattr(r, "is_template", False)),
                    is_shared=bool(getattr(r, "is_shared", False)),
                    level_id=getattr(r, "level_id", None),
                    subject_id=getattr(r, "subject_id", None),
                )
            )

    def filter_q(q):
        if only_templates:
            return q.filter_by(is_template=True)
        from sqlalchemy import or_
        return q.filter(or_(FileItem.is_template == True, FileItem.is_shared == True))  # noqa: E712

    if not type or type == "file":
        q = db.query(FileItem)
        if only_templates:
            q = q.filter(FileItem.is_template.is_(True))
        else:
            q = q.filter((FileItem.is_template.is_(True)) | (FileItem.is_shared.is_(True)))
        add(q.all(), "file", "title", "description")

    if not type or type == "exercise":
        q = db.query(Exercise)
        if only_templates:
            q = q.filter(Exercise.is_template.is_(True))
        else:
            q = q.filter((Exercise.is_template.is_(True)) | (Exercise.is_shared.is_(True)))
        add(q.all(), "exercise", "title", "statement")

    if not type or type == "quiz":
        q = db.query(Quiz)
        if only_templates:
            q = q.filter(Quiz.is_template.is_(True))
        else:
            q = q.filter((Quiz.is_template.is_(True)) | (Quiz.is_shared.is_(True)))
        add(q.all(), "quiz", "title", "description")

    if not type or type == "rubric":
        q = db.query(Rubric)
        if only_templates:
            q = q.filter(Rubric.is_template.is_(True))
        else:
            q = q.filter((Rubric.is_template.is_(True)) | (Rubric.is_shared.is_(True)))
        add(q.all(), "rubric", "title", "description")

    return items


class CloneOut(BaseModel):
    type: str
    id: int


@router.post("/clone/{kind}/{item_id}", response_model=CloneOut, status_code=201)
def clone_item(kind: str, item_id: int, db: Session = Depends(get_db)):
    if kind == "exercise":
        src = db.query(Exercise).filter(Exercise.id == item_id).first()
        if not src:
            raise HTTPException(404, "Introuvable")
        copy = Exercise(
            title=f"{src.title} (copie)",
            statement=src.statement,
            solution=src.solution,
            difficulty=src.difficulty,
            level_id=src.level_id,
            subject_id=src.subject_id,
            tags=src.tags,
            file_id=src.file_id,
            is_template=False,
            is_shared=False,
        )
        db.add(copy)
        db.commit()
        db.refresh(copy)
        return CloneOut(type="exercise", id=copy.id)

    if kind == "quiz":
        src = (
            db.query(Quiz)
            .options(joinedload(Quiz.questions).joinedload(QuizQuestion.choices))
            .filter(Quiz.id == item_id)
            .first()
        )
        if not src:
            raise HTTPException(404, "Introuvable")
        copy = Quiz(
            title=f"{src.title} (copie)",
            description=src.description,
            level_id=src.level_id,
            subject_id=src.subject_id,
            time_limit_min=src.time_limit_min,
            shuffle=src.shuffle,
            is_published=src.is_published,
            is_template=False,
            is_shared=False,
        )
        db.add(copy)
        db.flush()
        for q in src.questions:
            new_q = QuizQuestion(
                quiz_id=copy.id,
                position=q.position,
                kind=q.kind,
                prompt=q.prompt,
                code_snippet=q.code_snippet,
                explanation=q.explanation,
                points=q.points,
                expected_text=q.expected_text,
            )
            db.add(new_q)
            db.flush()
            for c in q.choices:
                db.add(
                    QuizChoice(
                        question_id=new_q.id,
                        position=c.position,
                        text=c.text,
                        is_correct=c.is_correct,
                    )
                )
        db.commit()
        db.refresh(copy)
        return CloneOut(type="quiz", id=copy.id)

    if kind == "rubric":
        src = (
            db.query(Rubric)
            .options(joinedload(Rubric.criteria))
            .filter(Rubric.id == item_id)
            .first()
        )
        if not src:
            raise HTTPException(404, "Introuvable")
        copy = Rubric(
            title=f"{src.title} (copie)",
            description=src.description,
            subject_id=src.subject_id,
            level_id=src.level_id,
            max_score=src.max_score,
            is_template=False,
            is_shared=False,
        )
        db.add(copy)
        db.flush()
        for c in src.criteria:
            db.add(
                RubricCriterion(
                    rubric_id=copy.id,
                    position=c.position,
                    name=c.name,
                    description=c.description,
                    weight=c.weight,
                    max_score=c.max_score,
                )
            )
        db.commit()
        db.refresh(copy)
        return CloneOut(type="rubric", id=copy.id)

    raise HTTPException(400, "Type non supporté")
