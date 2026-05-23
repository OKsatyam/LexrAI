from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.explore import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_explore_route_exists():
    response = client.post(
        "/explore",
        json={"repo_id": "abc123", "question": "what does auth.py do?"},
    )
    assert response.status_code != 404


def test_explore_with_conversation_id():
    response = client.post(
        "/explore",
        json={
            "repo_id": "abc123",
            "question": "what does auth.py do?",
            "conversation_id": "existing-session-id",
        },
    )
    assert response.status_code != 404
