import os
import shutil
import tempfile
from pathlib import Path

# Set isolated data dir BEFORE app modules are imported by any test
_TEST_DATA_DIR = Path(tempfile.mkdtemp(prefix="teacherhub-test-"))
os.environ["TEACHER_HUB_DATA_DIR"] = str(_TEST_DATA_DIR)
os.environ["TEACHER_HUB_TESTING"] = "1"

import pytest


@pytest.fixture(autouse=True)
def reset_db():
    """Reset DB before each test by dropping/recreating all tables."""
    from app.database import Base, engine
    from app.seed import init_database

    Base.metadata.drop_all(bind=engine)
    init_database()
    yield


def pytest_sessionfinish(session, exitstatus):
    shutil.rmtree(_TEST_DATA_DIR, ignore_errors=True)


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_token(client) -> str:
    r = client.post(
        "/api/auth/login",
        json={"email": "prof@teacher-hub.local", "password": "changeme123"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token) -> dict:
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def first_level_id(client, auth_headers) -> int:
    r = client.get("/api/levels", headers=auth_headers)
    assert r.status_code == 200, r.text
    levels = r.json()
    assert levels, "expected seeded levels"
    return levels[0]["id"]
