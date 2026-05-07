"""User management: list, create, update, delete; password change/reset; profile."""
import secrets
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import schemas
from ..auth import get_current_user, hash_password, verify_password
from ..database import get_db
from ..models import User

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/", response_model=List[schemas.UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(User).order_by(User.full_name).all()


@router.post("/", response_model=schemas.UserOut)
def create_user(
    payload: schemas.UserIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if current.role != "admin" and db.query(User).count() > 0:
        raise HTTPException(status_code=403, detail="Seul un admin peut créer un utilisateur")
    if not payload.password:
        raise HTTPException(status_code=400, detail="Mot de passe requis")
    email = payload.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role or "teacher",
        avatar_color=payload.avatar_color or "#6366f1",
        bio=payload.bio or "",
        is_active=payload.is_active if payload.is_active is not None else True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/me", response_model=schemas.UserOut)
def update_me(
    payload: schemas.UserIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    current.full_name = payload.full_name
    if payload.avatar_color:
        current.avatar_color = payload.avatar_color
    if payload.bio is not None:
        current.bio = payload.bio
    db.commit()
    db.refresh(current)
    return current


@router.put("/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    payload: schemas.UserIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if current.role != "admin" and current.id != user_id:
        raise HTTPException(status_code=403, detail="Action réservée à l'admin")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user.full_name = payload.full_name
    if payload.avatar_color:
        user.avatar_color = payload.avatar_color
    if payload.bio is not None:
        user.bio = payload.bio
    if current.role == "admin":
        if payload.role:
            user.role = payload.role
        if payload.is_active is not None:
            user.is_active = payload.is_active
        if payload.password:
            user.password_hash = hash_password(payload.password)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if current.role != "admin":
        raise HTTPException(status_code=403, detail="Action réservée à l'admin")
    if current.id == user_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    db.delete(user)
    db.commit()
    return {"ok": True}


@router.post("/me/password")
def change_password(
    payload: schemas.PasswordChangeIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current.password_hash):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Nouveau mot de passe trop court (min 6 caractères)")
    current.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}


@router.post("/forgot")
def forgot_password(payload: schemas.PasswordResetRequestIn, db: Session = Depends(get_db)):
    """Generate a reset token. In a fully-fledged setup this would email the link.

    Here we return the token directly so the teacher can use it in the reset form.
    Token is valid for 1 hour.
    """
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"ok": True, "message": "Si l'email existe, un lien a été envoyé."}
    token = secrets.token_urlsafe(24)
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()
    # In production, replace with a send-email call. For now we expose it.
    return {"ok": True, "token": token, "expires_in_minutes": 60}


@router.post("/reset")
def reset_password(payload: schemas.PasswordResetIn, db: Session = Depends(get_db)):
    if not payload.token:
        raise HTTPException(status_code=400, detail="Jeton manquant")
    user = db.query(User).filter(User.reset_token == payload.token).first()
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Jeton invalide ou expiré")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Mot de passe trop court (min 6 caractères)")
    user.password_hash = hash_password(payload.new_password)
    user.reset_token = ""
    user.reset_token_expires = None
    db.commit()
    return {"ok": True}
