"""Seed initial data on first run."""
import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from sqlalchemy.schema import CreateColumn

from . import config
from .auth import hash_password
from .database import SessionLocal, engine, Base
from .models import Level, Subject, User

log = logging.getLogger(__name__)


def _upgrade_schema(eng: Engine) -> None:
    """Add any model columns that are missing from existing tables.

    Uses ALTER TABLE ADD COLUMN. SQLite supports this for all our column types
    (nullable, with defaults). New tables are created by Base.metadata.create_all.
    """
    inspector = inspect(eng)
    existing_tables = set(inspector.get_table_names())

    for table in Base.metadata.sorted_tables:
        if table.name not in existing_tables:
            continue  # create_all will handle brand-new tables
        existing_cols = {c["name"] for c in inspector.get_columns(table.name)}
        for col in table.columns:
            if col.name in existing_cols:
                continue
            ddl = CreateColumn(col).compile(dialect=eng.dialect).string.strip()
            stmt = f'ALTER TABLE "{table.name}" ADD COLUMN {ddl}'
            log.warning("Schema upgrade: %s", stmt)
            with eng.begin() as conn:
                conn.execute(text(stmt))


def _backfill_user_defaults(db: Session) -> None:
    """Backfill columns added in later packs (NULL after ALTER TABLE ADD COLUMN)."""
    default_email = config.DEFAULT_USER_EMAIL.lower()
    for u in db.query(User).all():
        changed = False
        if u.role is None or u.role == "":
            u.role = "admin" if u.email == default_email else "teacher"
            changed = True
        if u.twofa_secret is None:
            u.twofa_secret = ""
            changed = True
        if u.twofa_enabled is None:
            u.twofa_enabled = False
            changed = True
        if changed:
            db.add(u)


def init_database():
    Base.metadata.create_all(bind=engine)
    _upgrade_schema(engine)
    db: Session = SessionLocal()
    try:
        # Default user
        if not db.query(User).first():
            user = User(
                email=config.DEFAULT_USER_EMAIL.lower(),
                password_hash=hash_password(config.DEFAULT_USER_PASSWORD),
                full_name=config.DEFAULT_USER_NAME,
                role="admin",
            )
            db.add(user)
        else:
            _backfill_user_defaults(db)

        # Default levels (Tunisian secondary curriculum)
        if not db.query(Level).first():
            default_levels = [
                ("7ème", "#0ea5e9", 1),
                ("8ème", "#10b981", 2),
                ("9ème", "#f59e0b", 3),
                ("1ère année secondaire", "#a855f7", 4),
                ("2ème année (Sciences)", "#ec4899", 5),
                ("3ème année (Sciences Info)", "#8b5cf6", 6),
                ("Bac Informatique", "#ef4444", 7),
            ]
            for name, color, order in default_levels:
                db.add(Level(name=name, color=color, sort_order=order))

        # Default subjects
        if not db.query(Subject).first():
            default_subjects = [
                ("Algorithmique", "#6366f1", "code"),
                ("Programmation Python", "#0ea5e9", "code-2"),
                ("Bases de données", "#10b981", "database"),
                ("Réseaux", "#f59e0b", "network"),
                ("Systèmes", "#ef4444", "cpu"),
                ("Web", "#a855f7", "globe"),
                ("Bureautique", "#ec4899", "file-text"),
            ]
            for name, color, icon in default_subjects:
                db.add(Subject(name=name, color=color, icon=icon))

        db.commit()
    finally:
        db.close()
