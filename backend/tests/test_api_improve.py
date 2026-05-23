from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.improve import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_improve_route_exists():
    response = client.get("/improve", params={"repo_id": "abc123"})
    assert response.status_code != 404
