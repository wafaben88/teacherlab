def test_classes_crud(client, auth_headers, first_level_id):
    r = client.post(
        "/api/classes",
        headers=auth_headers,
        json={"name": "3ème A", "level_id": first_level_id, "school_year": "2025-2026"},
    )
    assert r.status_code in (200, 201), r.text
    cid = r.json()["id"]

    r = client.get("/api/classes", headers=auth_headers)
    assert r.status_code == 200
    assert any(c["id"] == cid for c in r.json())

    r = client.put(
        f"/api/classes/{cid}",
        headers=auth_headers,
        json={"name": "3ème A (modifiée)", "level_id": first_level_id, "school_year": "2025-2026"},
    )
    assert r.status_code == 200
    assert r.json()["name"] == "3ème A (modifiée)"

    r = client.delete(f"/api/classes/{cid}", headers=auth_headers)
    assert r.status_code in (200, 204)


def test_classes_requires_auth(client):
    r = client.get("/api/classes")
    assert r.status_code == 401
