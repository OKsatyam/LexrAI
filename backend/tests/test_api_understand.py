from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.understand import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_understand_not_found():
    with patch("app.api.understand.get_repo", return_value=None):
        assert client.get("/understand", params={"repo_id": "abc"}).status_code == 404


def test_understand_not_ready():
    with patch("app.api.understand.get_repo", return_value={"status": "indexing"}):
        assert client.get("/understand", params={"repo_id": "abc"}).status_code == 409


def test_understand_success():
    with patch("app.api.understand.get_repo", return_value={
        "status": "done", "understand": "This repo does X."
    }):
        response = client.get("/understand", params={"repo_id": "abc"})
    assert response.status_code == 200
    assert response.json()["summary"] == "This repo does X."
