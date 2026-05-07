import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import Rubric, RubricCriterion, RubricEvaluation

router = APIRouter(
    prefix="/api/rubrics",
    tags=["rubrics"],
    dependencies=[Depends(get_current_user)],
)


def _compute_final(rubric: Rubric, scores: dict) -> float:
    if not rubric.criteria:
        return 0.0
    total_weight = 0.0
    weighted = 0.0
    for c in rubric.criteria:
        total_weight += c.weight or 0.0
        raw = float(scores.get(str(c.id), scores.get(c.id, 0)) or 0)
        ratio = raw / (c.max_score or 1)
        weighted += ratio * (c.weight or 0.0)
    if total_weight <= 0:
        return 0.0
    return round((weighted / total_weight) * (rubric.max_score or 20), 2)


@router.get("", response_model=List[schemas.RubricOut])
def list_rubrics(db: Session = Depends(get_db)):
    return (
        db.query(Rubric)
        .options(joinedload(Rubric.criteria), joinedload(Rubric.subject), joinedload(Rubric.level))
        .order_by(Rubric.created_at.desc())
        .all()
    )


@router.post("", response_model=schemas.RubricOut, status_code=201)
def create_rubric(payload: schemas.RubricIn, db: Session = Depends(get_db)):
    data = payload.model_dump()
    criteria = data.pop("criteria", [])
    rubric = Rubric(**data)
    db.add(rubric)
    db.flush()
    for i, c in enumerate(criteria):
        c["position"] = c.get("position") or i
        db.add(RubricCriterion(rubric_id=rubric.id, **c))
    db.commit()
    db.refresh(rubric)
    return rubric


@router.get("/templates", response_model=List[schemas.RubricOut])
def list_rubric_templates(db: Session = Depends(get_db)):
    return (
        db.query(Rubric)
        .options(joinedload(Rubric.criteria))
        .filter(Rubric.is_template.is_(True))
        .order_by(Rubric.created_at.desc())
        .all()
    )


@router.get("/{rubric_id}", response_model=schemas.RubricOut)
def get_rubric(rubric_id: int, db: Session = Depends(get_db)):
    rubric = db.query(Rubric).filter(Rubric.id == rubric_id).first()
    if not rubric:
        raise HTTPException(404, "Grille introuvable")
    return rubric


@router.put("/{rubric_id}", response_model=schemas.RubricOut)
def update_rubric(rubric_id: int, payload: schemas.RubricIn, db: Session = Depends(get_db)):
    rubric = db.query(Rubric).filter(Rubric.id == rubric_id).first()
    if not rubric:
        raise HTTPException(404, "Grille introuvable")
    data = payload.model_dump()
    criteria = data.pop("criteria", [])
    for k, v in data.items():
        setattr(rubric, k, v)
    # replace criteria
    db.query(RubricCriterion).filter(RubricCriterion.rubric_id == rubric.id).delete()
    db.flush()
    for i, c in enumerate(criteria):
        c["position"] = c.get("position") or i
        db.add(RubricCriterion(rubric_id=rubric.id, **c))
    db.commit()
    db.refresh(rubric)
    return rubric


@router.delete("/{rubric_id}", status_code=204)
def delete_rubric(rubric_id: int, db: Session = Depends(get_db)):
    rubric = db.query(Rubric).filter(Rubric.id == rubric_id).first()
    if not rubric:
        raise HTTPException(404, "Grille introuvable")
    db.delete(rubric)
    db.commit()


# ---- evaluations ----
eval_router = APIRouter(
    prefix="/api/rubric-evaluations",
    tags=["rubrics"],
    dependencies=[Depends(get_current_user)],
)


@eval_router.get("", response_model=List[schemas.RubricEvaluationOut])
def list_evaluations(
    rubric_id: Optional[int] = None,
    class_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(RubricEvaluation).options(
        joinedload(RubricEvaluation.student),
        joinedload(RubricEvaluation.rubric).joinedload(Rubric.criteria),
    )
    if rubric_id is not None:
        q = q.filter(RubricEvaluation.rubric_id == rubric_id)
    if class_id is not None:
        q = q.filter(RubricEvaluation.class_id == class_id)
    return q.order_by(RubricEvaluation.date.desc()).all()


@eval_router.post("", response_model=schemas.RubricEvaluationOut, status_code=201)
def create_evaluation(payload: schemas.RubricEvaluationIn, db: Session = Depends(get_db)):
    rubric = db.query(Rubric).filter(Rubric.id == payload.rubric_id).first()
    if not rubric:
        raise HTTPException(404, "Grille introuvable")
    final = _compute_final(rubric, payload.scores or {})
    ev = RubricEvaluation(
        rubric_id=payload.rubric_id,
        student_id=payload.student_id,
        student_label=payload.student_label or "",
        class_id=payload.class_id,
        scores_json=json.dumps(payload.scores or {}),
        final_score=final,
        notes=payload.notes or "",
    )
    if payload.date:
        ev.date = payload.date
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


@eval_router.put("/{eval_id}", response_model=schemas.RubricEvaluationOut)
def update_evaluation(
    eval_id: int, payload: schemas.RubricEvaluationIn, db: Session = Depends(get_db)
):
    ev = db.query(RubricEvaluation).filter(RubricEvaluation.id == eval_id).first()
    if not ev:
        raise HTTPException(404, "Évaluation introuvable")
    rubric = db.query(Rubric).filter(Rubric.id == payload.rubric_id).first()
    if not rubric:
        raise HTTPException(404, "Grille introuvable")
    ev.rubric_id = payload.rubric_id
    ev.student_id = payload.student_id
    ev.student_label = payload.student_label or ""
    ev.class_id = payload.class_id
    ev.scores_json = json.dumps(payload.scores or {})
    ev.final_score = _compute_final(rubric, payload.scores or {})
    ev.notes = payload.notes or ""
    if payload.date:
        ev.date = payload.date
    db.commit()
    db.refresh(ev)
    return ev


@eval_router.delete("/{eval_id}", status_code=204)
def delete_evaluation(eval_id: int, db: Session = Depends(get_db)):
    ev = db.query(RubricEvaluation).filter(RubricEvaluation.id == eval_id).first()
    if not ev:
        raise HTTPException(404, "Évaluation introuvable")
    db.delete(ev)
    db.commit()
