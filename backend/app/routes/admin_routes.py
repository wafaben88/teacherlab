"""Admin routes: audit logs, security oversight."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import AuditLog, User

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/audit-logs", response_model=List[schemas.AuditLogOut])
def list_audit_logs(
    limit: int = 200,
    action: Optional[str] = None,
    user_id: Optional[int] = None,
    entity: Optional[str] = None,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if current.role != "admin":
        raise HTTPException(status_code=403, detail="Action réservée à l'admin")
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if user_id is not None:
        q = q.filter(AuditLog.user_id == user_id)
    if entity:
        q = q.filter(AuditLog.entity == entity)
    return q.order_by(AuditLog.created_at.desc()).limit(min(max(limit, 1), 1000)).all()
