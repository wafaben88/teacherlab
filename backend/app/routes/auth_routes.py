import pyotp
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .. import schemas
from ..auth import (
    create_access_token,
    get_current_user,
    verify_password,
)
from ..database import get_db
from ..models import User
from ..security import client_ip, log_audit, rate_limit, reset_rate_limit


class LoginInput(schemas.LoginInput):
    twofa_code: str | None = None


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=schemas.TokenOut)
def login(payload: LoginInput, request: Request, db: Session = Depends(get_db)):
    ip = client_ip(request)
    rate_limit(f"login:{ip}", max_requests=10, window_seconds=60.0)
    rate_limit(f"login:email:{payload.email.lower().strip()}", max_requests=10, window_seconds=60.0)

    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        log_audit(db, user_id=user.id if user else None, action="login.failed",
                  details=payload.email, ip=ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    if user.twofa_enabled and user.twofa_secret:
        if not payload.twofa_code:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Code 2FA requis",
                headers={"x-twofa-required": "1"},
            )
        if not pyotp.TOTP(user.twofa_secret).verify(payload.twofa_code, valid_window=1):
            log_audit(db, user_id=user.id, action="login.2fa_failed", ip=ip)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Code 2FA invalide",
            )
    reset_rate_limit(f"login:{ip}")
    reset_rate_limit(f"login:email:{payload.email.lower().strip()}")
    log_audit(db, user_id=user.id, action="login.ok", ip=ip)
    token = create_access_token(user.id)
    return schemas.TokenOut(access_token=token, user=schemas.UserOut.model_validate(user))


@router.get("/me", response_model=schemas.UserOut)
def me(user: User = Depends(get_current_user)):
    return user
