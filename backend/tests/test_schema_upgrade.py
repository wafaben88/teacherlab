"""Regression tests for the seed/upgrade path on legacy DB shapes."""
import sqlite3


def test_backfill_normalizes_null_legacy_user_columns(client):
    """A user row with NULL is_active/avatar_color/bio must be normalized
    so /api/auth/login can return a valid UserOut.

    Guards against the regression Aymen reported where a DB rolled over
    from an older pack still had NULL in non-null Pydantic fields.
    """
    from app.database import engine, SessionLocal
    from app.seed import _backfill_all_defaults

    db_path = engine.url.database
    assert db_path, "expected file-based SQLite for this test"
    con = sqlite3.connect(db_path)
    try:
        con.execute(
            "UPDATE users SET is_active=NULL, avatar_color=NULL, bio=NULL, "
            "full_name='', reset_token=NULL, role=NULL, "
            "twofa_secret=NULL, twofa_enabled=NULL "
            "WHERE email='prof@teacher-hub.local'"
        )
        con.commit()
    finally:
        con.close()

    db = SessionLocal()
    try:
        _backfill_all_defaults(db)
        db.commit()
    finally:
        db.close()

    r = client.post(
        "/api/auth/login",
        json={"email": "prof@teacher-hub.local", "password": "changeme123"},
    )
    assert r.status_code == 200, r.text
    user = r.json()["user"]
    assert user["is_active"] is True
    assert user["avatar_color"] == "#6366f1"
    assert user["bio"] == ""
    assert user["role"] == "admin"
    assert user["full_name"]


def test_backfill_normalizes_null_legacy_file_columns(client, auth_headers):
    """Legacy file rows with NULL description/tags/mime_type/etc. must be
    normalized so /api/files (FileOut) does not 500.

    Bug Aymen ran into a second time: the seed-only fix on the User table
    left FileItem rows still NULL on description/tags, the FileOut.description:
    str validator made /api/files crash with a Pydantic ValidationError → 500
    → no CORS header → browser cried 'CORS error'.
    """
    from app.database import engine, SessionLocal
    from app.models import FileItem
    from app.seed import _backfill_all_defaults

    db = SessionLocal()
    try:
        item = FileItem(
            title="legacy.txt",
            storage_name="legacy.txt",
            original_name="legacy.txt",
        )
        db.add(item)
        db.commit()
        item_id = item.id
    finally:
        db.close()

    db_path = engine.url.database
    con = sqlite3.connect(db_path)
    try:
        con.execute(
            "UPDATE files SET description=NULL, kind=NULL, tags=NULL, "
            "mime_type=NULL, size_bytes=NULL, version=NULL, ocr_text=NULL, "
            "is_template=NULL, is_shared=NULL "
            "WHERE id=?",
            (item_id,),
        )
        con.commit()
    finally:
        con.close()

    db = SessionLocal()
    try:
        n = _backfill_all_defaults(db)
        db.commit()
    finally:
        db.close()
    assert n >= 1, "should have touched the legacy row"

    r = client.get("/api/files", headers=auth_headers)
    assert r.status_code == 200, r.text
    rows = [x for x in r.json() if x["id"] == item_id]
    assert rows, "legacy file should be returned by /api/files"
    legacy = rows[0]
    assert legacy["description"] == ""
    assert legacy["tags"] == ""
    assert legacy["mime_type"]
    assert isinstance(legacy["size_bytes"], int)
    assert isinstance(legacy["is_template"], bool)
    assert isinstance(legacy["is_shared"], bool)
    assert legacy["version"] >= 1


def test_500_carries_cors_header():
    """Unhandled exceptions must still ship CORS headers, otherwise the
    browser surfaces them as 'CORS error' (the dead-end Aymen hit when a
    Pydantic 500 swallowed Access-Control-Allow-Origin).
    """
    from fastapi import APIRouter
    from fastapi.testclient import TestClient
    from app.main import app

    boom = APIRouter()

    @boom.get("/__boom_test__")
    def kaboom():
        raise RuntimeError("synthetic test failure")

    app.include_router(boom)
    # raise_server_exceptions=False so the handler actually returns the
    # 500 response instead of TestClient re-raising the original exception.
    with TestClient(app, raise_server_exceptions=False) as c:
        try:
            r = c.get(
                "/__boom_test__",
                headers={"origin": "http://localhost:5173"},
            )
        finally:
            app.router.routes = [
                route for route in app.router.routes
                if getattr(route, "path", "") != "/__boom_test__"
            ]
    assert r.status_code == 500
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
    body = r.json()
    assert body["error_type"] == "RuntimeError"
    assert body["error_message"] == "synthetic test failure"
