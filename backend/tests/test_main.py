from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_all_routes_registered():
    routes = [r.path for r in app.routes]
    assert "/ingest" in routes
    assert "/understand" in routes
    assert "/explore" in routes
    assert "/improve" in routes
    assert "/health" in routes
