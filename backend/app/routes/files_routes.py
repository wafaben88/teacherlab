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
from ..models import FileItem, FileVersion

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
    for v in item.versions:
        (config.UPLOADS_DIR / v.storage_name).unlink(missing_ok=True)
    db.delete(item)
    db.commit()


@router.get("/{file_id}/versions", response_model=List[schemas.FileVersionOut])
def list_versions(file_id: int, db: Session = Depends(get_db)):
    item = db.query(FileItem).filter(FileItem.id == file_id).first()
    if not item:
        raise HTTPException(404, "Fichier introuvable")
    return item.versions


@router.post("/{file_id}/versions", response_model=schemas.FileOut, status_code=201)
async def upload_new_version(
    file_id: int,
    upload: UploadFile = File(...),
    note: Optional[str] = Form(""),
    db: Session = Depends(get_db),
):
    item = db.query(FileItem).filter(FileItem.id == file_id).first()
    if not item:
        raise HTTPException(404, "Fichier introuvable")
    if not upload.filename:
        raise HTTPException(400, "Fichier invalide")

    # snapshot current file as a previous version
    prev = FileVersion(
        file_id=item.id,
        version=item.version,
        storage_name=item.storage_name,
        original_name=item.original_name,
        mime_type=item.mime_type,
        size_bytes=item.size_bytes,
        note=note or "",
    )
    db.add(prev)

    # save new file
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

    item.version = (item.version or 1) + 1
    item.storage_name = storage_name
    item.original_name = upload.filename
    item.mime_type = upload.content_type or "application/octet-stream"
    item.size_bytes = size
    item.ocr_text = ""  # invalidate OCR for new version
    db.commit()
    db.refresh(item)
    return item


@router.post("/{file_id}/ocr", response_model=schemas.FileOut)
def run_ocr(file_id: int, db: Session = Depends(get_db)):
    item = db.query(FileItem).filter(FileItem.id == file_id).first()
    if not item:
        raise HTTPException(404, "Fichier introuvable")
    target = config.UPLOADS_DIR / item.storage_name
    if not target.exists():
        raise HTTPException(404, "Fichier manquant sur le disque")

    text = ""
    mime = (item.mime_type or "").lower()
    try:
        if "pdf" in mime or item.original_name.lower().endswith(".pdf"):
            try:
                from pypdf import PdfReader
                reader = PdfReader(str(target))
                parts = []
                for page in reader.pages:
                    try:
                        parts.append(page.extract_text() or "")
                    except Exception:
                        continue
                text = "\n".join(parts).strip()
            except Exception as exc:
                raise HTTPException(500, f"Lecture PDF impossible: {exc}")
        elif mime.startswith("image/"):
            try:
                import pytesseract
                from PIL import Image
                text = pytesseract.image_to_string(Image.open(target))
            except Exception:
                raise HTTPException(
                    501,
                    "OCR images indisponible (installe tesseract + pytesseract).",
                )
        elif mime.startswith("text/"):
            text = target.read_text(encoding="utf-8", errors="replace")
        else:
            raise HTTPException(415, "Type de fichier non supporté pour l'OCR")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Erreur OCR: {exc}")

    item.ocr_text = text or ""
    db.commit()
    db.refresh(item)
    return item


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
