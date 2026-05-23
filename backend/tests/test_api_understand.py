from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.understand import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_understand_route_exists():
    response = client.get("/understand", params={"repo_id": "abc123"})
    assert response.status_code != 404
