import os
from pathlib import Path

def _resolve_data_dir() -> Path:
    env = os.environ.get("TEACHER_HUB_DATA_DIR")
    if env:
        return Path(env)
    # If running on the deployment server with a mounted volume at /data, use it
    if Path("/data").is_dir():
        return Path("/data")
    return Path(__file__).parent.parent / "data"


DATA_DIR = _resolve_data_dir()
DATA_DIR.mkdir(parents=True, exist_ok=True)

UPLOADS_DIR = DATA_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "app.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

JWT_SECRET = os.environ.get("TEACHER_HUB_JWT_SECRET", "change-me-in-production-please")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 14  # 14 days

DEFAULT_USER_EMAIL = os.environ.get("TEACHER_HUB_DEFAULT_EMAIL", "prof@teacher-hub.local")
DEFAULT_USER_PASSWORD = os.environ.get("TEACHER_HUB_DEFAULT_PASSWORD", "changeme123")
DEFAULT_USER_NAME = os.environ.get("TEACHER_HUB_DEFAULT_NAME", "Enseignant")

MAX_UPLOAD_BYTES = int(os.environ.get("TEACHER_HUB_MAX_UPLOAD", str(50 * 1024 * 1024)))  # 50 MB
