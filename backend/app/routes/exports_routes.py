from collections import defaultdict
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from ..auth import get_current_user
from ..database import get_db
from ..models import (
    Exercise,
    FileItem,
    Grade,
    SchoolClass,
    Student,
    User,
)
from ..pdf_utils import render_grade_report, render_handout, render_student_report

router = APIRouter(
    prefix="/api/exports",
    tags=["exports"],
    dependencies=[Depends(get_current_user)],
)


def _format_score(score: float, max_score: float) -> str:
    if max_score and max_score != 20:
        scaled = (score / max_score) * 20
        return f"{score:.2f}/{max_score:.0f} ({scaled:.2f}/20)"
    return f"{score:.2f}/20"


def _user_full_name(db: Session) -> str:
    u: Optional[User] = db.query(User).first()
    return u.full_name if u else "Enseignant"


@router.get("/class/{class_id}/grades.pdf")
def export_class_grades(class_id: int, db: Session = Depends(get_db)):
    cls = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()
    if not cls:
        raise HTTPException(404, "Classe introuvable")

    students = (
        db.query(Student)
        .filter(Student.class_id == class_id)
        .order_by(Student.last_name, Student.first_name)
        .all()
    )
    grades = (
        db.query(Grade)
        .options(joinedload(Grade.subject))
        .filter(Grade.class_id == class_id)
        .all()
    )

    if students:
        # Group by student name (best match: full name)
        by_student: dict = defaultdict(list)
        for g in grades:
            by_student[g.student_name.strip().lower()].append(g)

        rows: List[List[str]] = [["Élève", "Évaluations", "Moyenne /20"]]
        all_avgs: List[float] = []
        for s in students:
            full = f"{s.last_name} {s.first_name}".strip()
            key = full.lower()
            entries = by_student.get(key, [])
            if not entries:
                # Try with first/last reversed
                entries = by_student.get(f"{s.first_name} {s.last_name}".strip().lower(), [])
            if entries:
                scaled = [
                    (g.score / g.max_score * 20) if g.max_score else 0 for g in entries
                ]
                avg = sum(scaled) / len(scaled)
                all_avgs.append(avg)
                rows.append([full, str(len(entries)), f"{avg:.2f}"])
            else:
                rows.append([full, "0", "—"])
        avgs_row = (
            ["Moyenne classe", "", f"{(sum(all_avgs) / len(all_avgs)):.2f}"]
            if all_avgs
            else ["Moyenne classe", "", "—"]
        )
    else:
        # Fallback: group grades by student_name
        by_name: dict = defaultdict(list)
        for g in grades:
            by_name[g.student_name].append(g)
        rows = [["Élève", "Évaluations", "Moyenne /20"]]
        all_avgs = []
        for name, entries in sorted(by_name.items()):
            scaled = [(g.score / g.max_score * 20) if g.max_score else 0 for g in entries]
            avg = sum(scaled) / len(scaled)
            all_avgs.append(avg)
            rows.append([name, str(len(entries)), f"{avg:.2f}"])
        avgs_row = (
            ["Moyenne classe", "", f"{(sum(all_avgs) / len(all_avgs)):.2f}"]
            if all_avgs
            else ["Moyenne classe", "", "—"]
        )

    pdf = render_grade_report(
        class_name=cls.name,
        school_year=cls.school_year or "",
        teacher_name=_user_full_name(db),
        students_rows=rows,
        averages_row=avgs_row,
    )
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="bulletin_{cls.name}.pdf"'},
    )


@router.get("/student/{student_id}/report.pdf")
def export_student_report(student_id: int, db: Session = Depends(get_db)):
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(404, "Élève introuvable")
    cls = db.query(SchoolClass).filter(SchoolClass.id == s.class_id).first()
    full_name = f"{s.last_name} {s.first_name}".strip()
    grades = (
        db.query(Grade)
        .options(joinedload(Grade.subject))
        .filter(Grade.class_id == s.class_id)
        .filter(Grade.student_name.ilike(f"%{s.first_name}%{s.last_name}%"))
        .order_by(Grade.date.desc())
        .all()
    )
    if not grades:
        # fallback by direct match
        grades = (
            db.query(Grade)
            .options(joinedload(Grade.subject))
            .filter(Grade.class_id == s.class_id)
            .filter(
                (Grade.student_name == full_name)
                | (Grade.student_name == f"{s.first_name} {s.last_name}")
            )
            .order_by(Grade.date.desc())
            .all()
        )

    rows: List[List[str]] = [["Date", "Évaluation", "Matière", "Note"]]
    scaled: List[float] = []
    for g in grades:
        rows.append(
            [
                g.date.strftime("%d/%m/%Y") if g.date else "",
                g.assessment_title or "",
                g.subject.name if g.subject else "—",
                _format_score(g.score, g.max_score or 20),
            ]
        )
        if g.max_score:
            scaled.append(g.score / g.max_score * 20)
    avg = f"{sum(scaled) / len(scaled):.2f}/20" if scaled else "—"

    pdf = render_student_report(
        student_name=full_name,
        class_name=cls.name if cls else "",
        school_year=cls.school_year if cls else "",
        teacher_name=_user_full_name(db),
        rows=rows,
        average=avg,
        notes=s.notes or "",
    )
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="bulletin_{full_name}.pdf"'},
    )


@router.get("/exercise/{exercise_id}.pdf")
def export_exercise(exercise_id: int, with_solution: bool = False, db: Session = Depends(get_db)):
    ex = (
        db.query(Exercise)
        .options(joinedload(Exercise.level), joinedload(Exercise.subject))
        .filter(Exercise.id == exercise_id)
        .first()
    )
    if not ex:
        raise HTTPException(404, "Exercice introuvable")
    parts = []
    if ex.level:
        parts.append(ex.level.name)
    if ex.subject:
        parts.append(ex.subject.name)
    if ex.difficulty:
        parts.append(f"Difficulté : {ex.difficulty}")
    subtitle = " • ".join(parts)

    body = ex.statement or ""
    if with_solution and ex.solution:
        body = f"{body}\n\n**Correction**\n\n{ex.solution}"

    footer = f"Document généré pour {_user_full_name(db)} le {datetime.now().strftime('%d/%m/%Y')}"

    pdf = render_handout(
        title=ex.title,
        subtitle=subtitle,
        body_md=body,
        footer=footer,
    )
    safe_name = ex.title.replace("/", "_")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="exercice_{safe_name}.pdf"'},
    )


@router.get("/file/{file_id}/handout.pdf")
def export_file_handout(file_id: int, db: Session = Depends(get_db)):
    """Generate a one-page handout summary for a course/file (metadata + tags)."""
    f = (
        db.query(FileItem)
        .options(joinedload(FileItem.level), joinedload(FileItem.subject))
        .filter(FileItem.id == file_id)
        .first()
    )
    if not f:
        raise HTTPException(404, "Fichier introuvable")

    parts = []
    if f.level:
        parts.append(f.level.name)
    if f.subject:
        parts.append(f.subject.name)
    parts.append(f.kind)
    subtitle = " • ".join(parts)

    body = f.description or ""
    if f.tags:
        tags = ", ".join(t.strip() for t in f.tags.split(",") if t.strip())
        body = f"{body}\n\n**Tags :** {tags}"

    pdf = render_handout(
        title=f.title,
        subtitle=subtitle,
        body_md=body or "Pas de description.",
        footer=f"Fichier joint : {f.original_name}",
    )
    safe_name = f.title.replace("/", "_")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="fiche_{safe_name}.pdf"'},
    )
