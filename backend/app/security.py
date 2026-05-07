"""Security helpers: audit logging + simple in-memory rate limiting.

The rate limiter is intentionally lightweight (per-IP sliding window stored in a
process-local dict). It's enough to slow down brute-force attempts on auth
endpoints in a single-instance deployment. For multi-instance setups a Redis
backend would be plugged in here.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque, Dict, Optional

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from .models import AuditLog


# ---------- Audit log helper ----------
def log_audit(
    db: Session,
    *,
    user_id: Optional[int],
    action: str,
    entity: str = "",
    entity_id: Optional[int] = None,
    details: str = "",
    ip: str = "",
    commit: bool = True,
) -> None:
    """Persist an audit entry. Failures are swallowed to never break the request."""
    try:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            details=details[:1000] if details else "",
            ip=ip[:64] if ip else "",
        )
        db.add(entry)
        if commit:
            db.commit()
    except Exception:
        db.rollback()


def client_ip(request: Optional[Request]) -> str:
    if not request:
        return ""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    if request.client:
        return request.client.host or ""
    return ""


# ---------- Rate limiting ----------
_BUCKETS: Dict[str, Deque[float]] = defaultdict(deque)


def rate_limit(key: str, *, max_requests: int, window_seconds: float) -> None:
    """Raise 429 if the bucket has more than `max_requests` hits in `window_seconds`."""
    now = time.monotonic()
    bucket = _BUCKETS[key]
    cutoff = now - window_seconds
    while bucket and bucket[0] < cutoff:
        bucket.popleft()
    if len(bucket) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Trop de tentatives, réessaye dans une minute.",
        )
    bucket.append(now)


def reset_rate_limit(key: str) -> None:
    _BUCKETS.pop(key, None)
