from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.explore import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)

PAYLOAD = {"repo_id": "abc123", "question": "what does auth.py do?"}
ANSWER = {
    "answer": "auth.py handles JWT validation.",
    "sources": [{"file": "auth.py", "lines": "0", "snippet": "def auth(): pass"}],
    "conversation_id": "test-conv-id",
}


def test_explore_repo_not_found():
    with patch("app.api.explore.get_repo", return_value=None):
        response = client.post("/explore", json=PAYLOAD)
    assert response.status_code == 404


def test_explore_repo_not_ready():
    with patch("app.api.explore.get_repo", return_value={"status": "indexing"}):
        response = client.post("/explore", json=PAYLOAD)
    assert response.status_code == 409


def test_explore_success():
    with patch("app.api.explore.get_repo", return_value={"status": "done"}), \
         patch("app.api.explore.answer_question", return_value=ANSWER):
        response = client.post("/explore", json=PAYLOAD)
    assert response.status_code == 200
    data = response.json()
    assert data["answer"] == ANSWER["answer"]
    assert data["conversation_id"] == "test-conv-id"


def test_explore_with_conversation_id():
    payload = {**PAYLOAD, "conversation_id": "existing-id"}
    with patch("app.api.explore.get_repo", return_value={"status": "done"}), \
         patch("app.api.explore.answer_question", return_value=ANSWER) as mock_aq:
        response = client.post("/explore", json=payload)
    assert response.status_code == 200
