from datetime import datetime
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import Quiz, QuizAttempt, QuizChoice, QuizQuestion

router = APIRouter(
    prefix="/api/quizzes",
    tags=["quizzes"],
    dependencies=[Depends(get_current_user)],
)


def _quiz_query(db: Session):
    return (
        db.query(Quiz)
        .options(
            joinedload(Quiz.level),
            joinedload(Quiz.subject),
            joinedload(Quiz.questions).joinedload(QuizQuestion.choices),
        )
    )


def _replace_questions(db: Session, quiz: Quiz, questions: List[schemas.QuizQuestionIn]):
    # Replace strategy: drop existing children, recreate from payload
    db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).delete()
    db.flush()
    for idx, q in enumerate(questions):
        question = QuizQuestion(
            quiz_id=quiz.id,
            position=q.position if q.position else idx,
            kind=q.kind or "single",
            prompt=q.prompt,
            code_snippet=q.code_snippet or "",
            explanation=q.explanation or "",
            points=q.points or 1.0,
            expected_text=q.expected_text or "",
        )
        db.add(question)
        db.flush()
        for cidx, c in enumerate(q.choices):
            db.add(
                QuizChoice(
                    question_id=question.id,
                    position=c.position if c.position else cidx,
                    text=c.text,
                    is_correct=bool(c.is_correct),
                )
            )


@router.get("", response_model=List[schemas.QuizOut])
def list_quizzes(
    level_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = _quiz_query(db)
    if level_id is not None:
        q = q.filter(Quiz.level_id == level_id)
    if subject_id is not None:
        q = q.filter(Quiz.subject_id == subject_id)
    return q.order_by(Quiz.created_at.desc()).all()


@router.get("/{quiz_id}", response_model=schemas.QuizOut)
def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = _quiz_query(db).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Quiz introuvable")
    return quiz


@router.post("", response_model=schemas.QuizOut, status_code=201)
def create_quiz(payload: schemas.QuizIn, db: Session = Depends(get_db)):
    quiz = Quiz(
        title=payload.title,
        description=payload.description or "",
        level_id=payload.level_id,
        subject_id=payload.subject_id,
        time_limit_min=payload.time_limit_min or 0,
        shuffle=bool(payload.shuffle),
        is_published=bool(payload.is_published),
    )
    db.add(quiz)
    db.flush()
    _replace_questions(db, quiz, payload.questions)
    db.commit()
    return _quiz_query(db).filter(Quiz.id == quiz.id).first()


@router.put("/{quiz_id}", response_model=schemas.QuizOut)
def update_quiz(quiz_id: int, payload: schemas.QuizIn, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Quiz introuvable")
    quiz.title = payload.title
    quiz.description = payload.description or ""
    quiz.level_id = payload.level_id
    quiz.subject_id = payload.subject_id
    quiz.time_limit_min = payload.time_limit_min or 0
    quiz.shuffle = bool(payload.shuffle)
    quiz.is_published = bool(payload.is_published)
    _replace_questions(db, quiz, payload.questions)
    db.commit()
    return _quiz_query(db).filter(Quiz.id == quiz.id).first()


@router.delete("/{quiz_id}", status_code=204)
def delete_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Quiz introuvable")
    db.delete(quiz)
    db.commit()


@router.post("/{quiz_id}/submit", response_model=schemas.QuizSubmitOut)
def submit_quiz(quiz_id: int, payload: schemas.QuizSubmitIn, db: Session = Depends(get_db)):
    quiz = _quiz_query(db).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Quiz introuvable")

    answers_by_q = {a.question_id: a for a in payload.answers}
    detail: dict = {"questions": []}
    score = 0.0
    max_score = 0.0
    for q in quiz.questions:
        max_score += q.points
        ans = answers_by_q.get(q.id)
        if q.kind == "text":
            user_text = (ans.text if ans else "").strip().lower()
            expected = (q.expected_text or "").strip().lower()
            ok = bool(expected) and user_text == expected
            if ok:
                score += q.points
            detail["questions"].append(
                {
                    "id": q.id,
                    "kind": q.kind,
                    "user": user_text,
                    "expected": expected,
                    "ok": ok,
                    "points": q.points,
                }
            )
        else:
            correct = {c.id for c in q.choices if c.is_correct}
            chosen = set(ans.choice_ids) if ans else set()
            ok = correct == chosen and len(correct) > 0
            if ok:
                score += q.points
            detail["questions"].append(
                {
                    "id": q.id,
                    "kind": q.kind,
                    "chosen": list(chosen),
                    "correct": list(correct),
                    "ok": ok,
                    "points": q.points,
                }
            )

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        student_id=payload.student_id,
        student_label=payload.student_label or "",
        score=score,
        max_score=max_score,
        answers_json=json.dumps(detail),
        started_at=datetime.utcnow(),
        finished_at=datetime.utcnow(),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return schemas.QuizSubmitOut(
        id=attempt.id,
        quiz_id=attempt.quiz_id,
        student_id=attempt.student_id,
        student_label=attempt.student_label,
        score=attempt.score,
        max_score=attempt.max_score,
        started_at=attempt.started_at,
        finished_at=attempt.finished_at,
        detail=detail,
    )


@router.get("/{quiz_id}/attempts")
def list_attempts(quiz_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.quiz_id == quiz_id)
        .order_by(QuizAttempt.started_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "quiz_id": r.quiz_id,
            "student_id": r.student_id,
            "student_label": r.student_label,
            "score": r.score,
            "max_score": r.max_score,
            "started_at": r.started_at,
            "finished_at": r.finished_at,
        }
        for r in rows
    ]
