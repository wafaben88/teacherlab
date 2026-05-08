"""Regression tests for the seed/upgrade path on legacy DB shapes."""
import sqlite3

from sqlalchemy import inspect


def test_backfill_normalizes_null_legacy_user_columns(client):
    """A user row with NULL is_active/avatar_color/bio must be normalized
    so /api/auth/login can return a valid UserOut.

    This guards against the regression Aymen reported where a DB rolled
    over from an older pack still had NULL in non-null Pydantic fields.
    """
    from app.database import engine, SessionLocal
    from app.models import User
    from app.seed import _backfill_user_defaults

    # Force the seeded user into a legacy NULL shape directly via SQLite.
    db_path = engine.url.database
    assert db_path, "expected file-based SQLite for this test"
    con = sqlite3.connect(db_path)
    try:
        # Only the columns that are actually nullable in SQLite can be NULL.
        # full_name has NOT NULL on it; we still test the empty-string branch.
        con.execute(
            "UPDATE users SET is_active=NULL, avatar_color=NULL, bio=NULL, "
            "full_name='', reset_token=NULL, role=NULL, "
            "twofa_secret=NULL, twofa_enabled=NULL "
            "WHERE email='prof@teacher-hub.local'"
        )
        con.commit()
    finally:
        con.close()

    # Re-run backfill (idempotent, what init_database does on next startup).
    db = SessionLocal()
    try:
        _backfill_user_defaults(db)
        db.commit()
    finally:
        db.close()

    # Login must now work end-to-end (Pydantic UserOut serialization OK).
    r = client.post(
        "/api/auth/login",
        json={"email": "prof@teacher-hub.local", "password": "changeme123"},
    )
    assert r.status_code == 200, r.text
    user = r.json()["user"]
    assert user["is_active"] is True
    assert user["avatar_color"] == "#6366f1"
    assert user["bio"] == ""
    assert user["role"] == "admin"  # default email is promoted to admin
    assert user["full_name"]  # non-empty
