import json
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.improve import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)

FINDINGS = [{"tool": "ruff", "file": "main.py", "line": 10,
             "severity": "warning", "message": "too long", "explanation": "shorten it"}]


def test_improve_not_found():
    with patch("app.api.improve.get_repo", return_value=None):
        assert client.get("/improve", params={"repo_id": "abc"}).status_code == 404


def test_improve_not_ready():
    with patch("app.api.improve.get_repo", return_value={"status": "generating"}):
        assert client.get("/improve", params={"repo_id": "abc"}).status_code == 409


def test_improve_success():
    with patch("app.api.improve.get_repo", return_value={
        "status": "done", "improve": json.dumps(FINDINGS)
    }):
        response = client.get("/improve", params={"repo_id": "abc"})
    assert response.status_code == 200
    assert len(response.json()["findings"]) == 1
    assert response.json()["findings"][0]["tool"] == "ruff"


def test_improve_empty_findings():
    with patch("app.api.improve.get_repo", return_value={
        "status": "done", "improve": "[]"
    }):
        response = client.get("/improve", params={"repo_id": "abc"})
    assert response.status_code == 200
    assert response.json()["findings"] == []
