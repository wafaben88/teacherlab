def test_healthz(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_login_default_account(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "prof@teacher-hub.local", "password": "changeme123"},
    )
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert body["user"]["email"] == "prof@teacher-hub.local"


def test_login_wrong_password(client):
    r = client.post(
        "/api/auth/login",
        json={"email": "prof@teacher-hub.local", "password": "wrong"},
    )
    assert r.status_code == 401


def test_me_requires_auth(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_with_auth(client, auth_headers):
    r = client.get("/api/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email"] == "prof@teacher-hub.local"
