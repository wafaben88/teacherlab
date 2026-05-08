"""Seed initial data on first run."""
import logging
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Integer,
    Numeric,
    String,
    Text,
    inspect,
    text,
)
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


def _safe_default_for(col: Any) -> Any:
    """Compute a safe non-null default for a column when its row value is NULL.

    Used for legacy DBs that have NULL in columns the Pydantic Out-schemas
    declare as non-null (str/bool/int/float). We prefer the column's own
    SQLAlchemy default when it's a constant; otherwise we fall back to a
    type-appropriate empty value.
    """
    # Prefer the explicit SQLA default if it's a plain constant scalar.
    default = getattr(col, "default", None)
    if default is not None and getattr(default, "is_scalar", False):
        return default.arg

    py_type = type(col.type)
    if isinstance(col.type, (String, Text)):
        return ""
    if isinstance(col.type, Boolean):
        return False
    if isinstance(col.type, Integer):
        return 0
    if isinstance(col.type, (Float, Numeric)):
        return 0.0
    if isinstance(col.type, DateTime):
        return datetime.utcnow()
    # Unknown column type: leave alone.
    log.debug("No safe default known for column %s (%s)", col.name, py_type.__name__)
    return None


def _backfill_all_defaults(db: Session) -> int:
    """Walk every mapped table and coerce NULL → safe default.

    Why: older versions of the schema let some columns be persisted as NULL
    (or ALTER TABLE ADD COLUMN populates new columns with NULL). The Pydantic
    response models declare those fields as non-null, so a SELECT-ALL on
    such a row raises ValidationError and the request 500s. We normalize
    every nullable-with-default column once on startup so every legacy row
    comes back conforming.

    This is idempotent: rows already populated are left untouched.
    Returns the number of rows touched (for logging / tests).
    """
    touched = 0

    # Domain-specific extras run FIRST so the generic loop sees real values
    # and doesn't overwrite them with the column-level default. The default
    # admin user must keep role='admin', not be reset to the SQLA default
    # 'teacher'.
    default_email = config.DEFAULT_USER_EMAIL.lower()
    for u in db.query(User).all():
        if not u.role:
            u.role = "admin" if (u.email or "").lower() == default_email else "teacher"
            db.add(u)
            touched += 1
        if not u.full_name:
            u.full_name = config.DEFAULT_USER_NAME
            db.add(u)
            touched += 1

    for table in Base.metadata.sorted_tables:
        mapped_class = None
        for mapper in Base.registry.mappers:
            if mapper.local_table is table:
                mapped_class = mapper.class_
                break
        if mapped_class is None:
            continue

        # Columns we will normalize on read: must be set on the column object,
        # not relationships, and must have a safe default we can compute.
        normalizables = []
        for col in table.columns:
            if col.primary_key:
                continue
            if col.foreign_keys:
                continue  # FKs are intentionally nullable, leave them
            safe = _safe_default_for(col)
            if safe is None:
                continue
            normalizables.append((col.name, safe))

        if not normalizables:
            continue

        for row in db.query(mapped_class).all():
            changed = False
            for col_name, safe in normalizables:
                if getattr(row, col_name) is None:
                    setattr(row, col_name, safe)
                    changed = True
            if changed:
                db.add(row)
                touched += 1

    return touched


# Backwards-compat alias used by the existing pytest non-regression suite.
def _backfill_user_defaults(db: Session) -> int:
    return _backfill_all_defaults(db)


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
            n = _backfill_all_defaults(db)
            if n:
                log.warning("Schema backfill: normalized %d legacy NULL row(s)", n)

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
