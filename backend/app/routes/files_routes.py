import os
import uuid
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    Query,
)
from fastapi.responses import FileResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from .. import schemas, config
from ..auth import get_current_user
from ..database import get_db
from ..models import FileItem

router = APIRouter(prefix="/api/files", tags=["files"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=List[schemas.FileOut])
def list_files(
    level_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    kind: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(FileItem).options(
        joinedload(FileItem.level),
        joinedload(FileItem.subject),
    )
    if level_id is not None:
        q = q.filter(FileItem.level_id == level_id)
    if subject_id is not None:
        q = q.filter(FileItem.subject_id == subject_id)
    if kind:
        q = q.filter(FileItem.kind == kind)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(
            FileItem.title.ilike(like),
            FileItem.description.ilike(like),
            FileItem.tags.ilike(like),
            FileItem.original_name.ilike(like),
        ))
    return q.order_by(FileItem.created_at.desc()).all()


@router.post("/upload", response_model=schemas.FileOut, status_code=201)
async def upload_file(
    upload: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(""),
    kind: Optional[str] = Form("cours"),
    level_id: Optional[int] = Form(None),
    subject_id: Optional[int] = Form(None),
    tags: Optional[str] = Form(""),
    db: Session = Depends(get_db),
):
    if not upload.filename:
        raise HTTPException(400, "Fichier invalide")

    storage_name = f"{uuid.uuid4().hex}_{os.path.basename(upload.filename)}"
    target_path = config.UPLOADS_DIR / storage_name

    size = 0
    chunk_size = 1024 * 1024
    with target_path.open("wb") as out:
        while True:
            chunk = await upload.read(chunk_size)
            if not chunk:
                break
            size += len(chunk)
            if size > config.MAX_UPLOAD_BYTES:
                out.close()
                target_path.unlink(missing_ok=True)
                raise HTTPException(413, "Fichier trop volumineux (max 50 Mo)")
            out.write(chunk)

    item = FileItem(
        title=title or upload.filename,
        description=description or "",
        kind=kind or "cours",
        level_id=level_id,
        subject_id=subject_id,
        tags=tags or "",
        storage_name=storage_name,
        original_name=upload.filename,
        mime_type=upload.content_type or "application/octet-stream",
        size_bytes=size,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{file_id}", response_model=schemas.FileOut)
def get_file(file_id: int, db: Session = Depends(get_db)):
    item = db.query(FileItem).filter(FileItem.id == file_id).first()
    if not item:
        raise HTTPException(404, "Fichier introuvable")
    return item


@router.put("/{file_id}", response_model=schemas.FileOut)
def update_file(file_id: int, payload: schemas.FileMetaIn, db: Session = Depends(get_db)):
    item = db.query(FileItem).filter(FileItem.id == file_id).first()
    if not item:
        raise HTTPException(404, "Fichier introuvable")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(item, k, v if v is not None else getattr(item, k))
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{file_id}", status_code=204)
def delete_file(file_id: int, db: Session = Depends(get_db)):
    item = db.query(FileItem).filter(FileItem.id == file_id).first()
    if not item:
        raise HTTPException(404, "Fichier introuvable")
    target = config.UPLOADS_DIR / item.storage_name
    target.unlink(missing_ok=True)
    db.delete(item)
    db.commit()


# Public download endpoint with token via query string for direct browser links
from ..auth import oauth2_scheme  # noqa: E402
from fastapi.security.utils import get_authorization_scheme_param  # noqa: E402
from jose import JWTError, jwt  # noqa: E402
from ..models import User  # noqa: E402


def _user_from_token(token: Optional[str], db: Session) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        user_id = int(payload.get("sub", 0))
    except (JWTError, ValueError):
        return None
    return db.query(User).filter(User.id == user_id).first()


download_router = APIRouter(prefix="/api/files", tags=["files"])


@download_router.get("/{file_id}/download")
def download_file(
    file_id: int,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    user = _user_from_token(token, db)
    if not user:
        raise HTTPException(401, "Non authentifié")
    item = db.query(FileItem).filter(FileItem.id == file_id).first()
    if not item:
        raise HTTPException(404, "Fichier introuvable")
    target = config.UPLOADS_DIR / item.storage_name
    if not target.exists():
        raise HTTPException(404, "Fichier manquant sur le disque")
    return FileResponse(
        path=str(target),
        media_type=item.mime_type,
        filename=item.original_name,
    )
