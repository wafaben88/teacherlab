def test_backup_export(client, auth_headers):
    r = client.get("/api/backup/export", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["version"] == "1"
    assert "exported_at" in body
    assert "counts" in body
    assert "data" in body
    assert "users" in body["data"]


def test_backup_export_unauthenticated(client):
    r = client.get("/api/backup/export")
    assert r.status_code == 401


def test_backup_roundtrip(client, auth_headers, first_level_id):
    cls = client.post(
        "/api/classes",
        headers=auth_headers,
        json={"name": "Test 4ème B", "level_id": first_level_id, "school_year": "2025-2026"},
    )
    assert cls.status_code in (200, 201), cls.text

    exp = client.get("/api/backup/export", headers=auth_headers).json()
    assert any(c["name"] == "Test 4ème B" for c in exp["data"]["classes"])

    imp = client.post(
        "/api/backup/import",
        headers=auth_headers,
        json={"data": exp["data"], "replace": True},
    )
    assert imp.status_code == 200, imp.text

    classes = client.get("/api/classes", headers=auth_headers).json()
    assert any(c["name"] == "Test 4ème B" for c in classes)
