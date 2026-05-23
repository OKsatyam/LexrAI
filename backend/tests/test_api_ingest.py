from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.ingest import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_ingest_route_exists():
    response = client.post("/ingest", json={"github_url": "https://github.com/user/repo"})
    assert response.status_code != 404


def test_status_route_exists():
    response = client.get("/ingest/abc123/status")
    assert response.status_code != 404
