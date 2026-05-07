import pyotp


def test_2fa_setup_and_enable(client, auth_headers):
    status = client.get("/api/users/me/2fa", headers=auth_headers)
    assert status.status_code == 200
    assert status.json()["enabled"] is False

    setup = client.post("/api/users/me/2fa/setup", headers=auth_headers)
    assert setup.status_code == 200
    body = setup.json()
    assert "secret" in body
    assert "otpauth_url" in body

    code = pyotp.TOTP(body["secret"]).now()
    enable = client.post(
        "/api/users/me/2fa/enable",
        headers=auth_headers,
        json={"code": code},
    )
    assert enable.status_code == 200

    status2 = client.get("/api/users/me/2fa", headers=auth_headers)
    assert status2.json()["enabled"] is True


def test_2fa_login_required_when_enabled(client, auth_headers):
    setup = client.post("/api/users/me/2fa/setup", headers=auth_headers).json()
    code = pyotp.TOTP(setup["secret"]).now()
    client.post(
        "/api/users/me/2fa/enable",
        headers=auth_headers,
        json={"code": code},
    )

    r = client.post(
        "/api/auth/login",
        json={"email": "prof@teacher-hub.local", "password": "changeme123"},
    )
    assert r.status_code == 401
    assert "2fa" in r.json()["detail"].lower()

    code2 = pyotp.TOTP(setup["secret"]).now()
    r2 = client.post(
        "/api/auth/login",
        json={
            "email": "prof@teacher-hub.local",
            "password": "changeme123",
            "twofa_code": code2,
        },
    )
    assert r2.status_code == 200


def test_audit_logs_admin_only(client, auth_headers):
    r = client.get("/api/admin/audit-logs", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_audit_logs_unauthenticated(client):
    r = client.get("/api/admin/audit-logs")
    assert r.status_code == 401
