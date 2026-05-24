from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.ingest import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)

VALID_URL = "https://github.com/user/repo"
REPO_ID = "a1b2c3d4e5f6"


def test_ingest_valid_url():
    with patch("app.api.ingest.create_repo"), \
         patch("app.api.ingest._run_pipeline"):
        response = client.post("/ingest", json={"github_url": VALID_URL})
    assert response.status_code == 200
    assert "repo_id" in response.json()


def test_ingest_invalid_url():
    response = client.post("/ingest", json={"github_url": "not-a-url"})
    assert response.status_code == 400


def test_ingest_non_github_url():
    response = client.post("/ingest", json={"github_url": "https://gitlab.com/user/repo"})
    assert response.status_code == 400


def test_get_status_found():
    with patch("app.api.ingest.get_repo", return_value={"status": "done"}):
        response = client.get(f"/ingest/{REPO_ID}/status")
    assert response.status_code == 200
    assert response.json()["status"] == "done"
    assert response.json()["progress"] == "Complete"


def test_get_status_not_found():
    with patch("app.api.ingest.get_repo", return_value=None):
        response = client.get(f"/ingest/{REPO_ID}/status")
    assert response.status_code == 404


def test_repo_id_deterministic():
    from app.api.ingest import _make_repo_id
    assert _make_repo_id(VALID_URL) == _make_repo_id(VALID_URL)
    assert len(_make_repo_id(VALID_URL)) == 12
