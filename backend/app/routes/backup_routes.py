"""Backup routes: export the entire database to JSON, import a JSON dump."""
from datetime import datetime
from typing import Any, Dict, List, Type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import inspect as sql_inspect
from sqlalchemy.orm import Session

from .. import schemas, models
from ..auth import get_current_user
from ..database import get_db
from ..models import User
from ..security import log_audit

router = APIRouter(prefix="/api/backup", tags=["backup"])


# Tables exported / imported, in dependency-friendly order.
TABLES: List[Type[Any]] = [
    models.User,
    models.Level,
    models.Subject,
    models.SchoolClass,
    models.FileItem,
    models.FileVersion,
    models.Exercise,
    models.ScheduleEvent,
    models.Grade,
    models.TodoTask,
    models.Student,
    models.Attendance,
    models.Assignment,
    models.Submission,
    models.Competency,
    models.CompetencyAssessment,
    models.Quiz,
    models.QuizQuestion,
    models.QuizChoice,
    models.QuizAttempt,
    models.Rubric,
    models.RubricCriterion,
    models.RubricEvaluation,
    models.Resource,
    models.Notification,
    models.AuditLog,
]

# Sensitive columns are kept (so the backup is a true full copy) but the user
# may strip them by hand if they share the file.
SKIP_COLUMNS_DEFAULT = {"reset_token", "reset_token_expires"}


def _row_to_dict(row: Any) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for c in sql_inspect(row.__class__).columns:
        if c.name in SKIP_COLUMNS_DEFAULT:
            continue
        v = getattr(row, c.name)
        if isinstance(v, datetime):
            out[c.name] = v.isoformat()
        else:
            out[c.name] = v
    return out


def _coerce_value(model: Type[Any], column_name: str, value: Any) -> Any:
    col = sql_inspect(model).columns.get(column_name)
    if col is None:
        return value
    py_type = getattr(col.type, "python_type", None)
    if py_type is datetime and isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return value


@router.get("/export", response_model=schemas.BackupOut)
def export_backup(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    data: Dict[str, List[Dict[str, Any]]] = {}
    counts: Dict[str, int] = {}
    for table in TABLES:
        rows = db.query(table).all()
        data[table.__tablename__] = [_row_to_dict(r) for r in rows]
        counts[table.__tablename__] = len(rows)
    log_audit(
        db,
        user_id=current.id,
        action="backup.export",
        details=f"{sum(counts.values())} rows",
    )
    return schemas.BackupOut(
        version="1",
        exported_at=datetime.utcnow(),
        counts=counts,
        data=data,
    )


@router.post("/import")
def import_backup(
    payload: schemas.BackupImportIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if current.role != "admin":
        raise HTTPException(status_code=403, detail="Action réservée à l'admin")
    if not isinstance(payload.data, dict):
        raise HTTPException(status_code=400, detail="Format d'archive invalide")

    inserted: Dict[str, int] = {}
    if payload.replace:
        # Wipe in reverse-dependency order
        for table in reversed(TABLES):
            db.query(table).delete()
        db.commit()

    for table in TABLES:
        rows = payload.data.get(table.__tablename__, [])
        if not isinstance(rows, list):
            continue
        n = 0
        for raw in rows:
            if not isinstance(raw, dict):
                continue
            kwargs = {}
            for col in sql_inspect(table).columns:
                if col.name in raw:
                    kwargs[col.name] = _coerce_value(table, col.name, raw[col.name])
            try:
                db.merge(table(**kwargs))
                n += 1
            except Exception:
                db.rollback()
                continue
        db.commit()
        inserted[table.__tablename__] = n

    log_audit(
        db,
        user_id=current.id,
        action="backup.import",
        details=f"{sum(inserted.values())} rows, replace={payload.replace}",
    )
    return {"ok": True, "inserted": inserted}
