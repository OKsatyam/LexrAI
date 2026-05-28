import pytest
from app.storage.db import (
    init_db, create_repo, get_repo, update_repo_status,
    update_repo_summaries, set_improve_status,
)


@pytest.fixture
def tmp_db(tmp_path, monkeypatch):
    from app.core import config
    monkeypatch.setattr(config.settings, "storage_dir", tmp_path)
    monkeypatch.setattr(config.settings, "db_path", tmp_path / "test.db")
    init_db()


def test_create_and_get_repo(tmp_db):
    create_repo("abc123", "https://github.com/user/repo")
    repo = get_repo("abc123")
    assert repo is not None
    assert repo["status"] == "pending"
    assert repo["github_url"] == "https://github.com/user/repo"


def test_get_nonexistent_repo(tmp_db):
    assert get_repo("doesnotexist") is None


def test_update_status(tmp_db):
    create_repo("abc123", "https://github.com/user/repo")
    update_repo_status("abc123", "running")
    assert get_repo("abc123")["status"] == "running"


def test_update_summaries(tmp_db):
    create_repo("abc123", "https://github.com/user/repo")
    update_repo_summaries("abc123", '{"summary": "test"}', '{"findings": []}')
    repo = get_repo("abc123")
    assert repo["status"] == "done"
    assert repo["understand"] == '{"summary": "test"}'
    assert repo["ingested_at"] is not None


def test_set_improve_status_and_get(tmp_path, monkeypatch):
    monkeypatch.setattr("app.storage.db.settings.db_path", tmp_path / "test.db")
    monkeypatch.setattr("app.storage.db.settings.storage_dir", tmp_path)
    init_db()
    create_repo("abc123", "https://github.com/test/repo")
    set_improve_status("abc123", "running", "Starting agent...")
    repo = get_repo("abc123")
    assert repo["improve_status"] == "running"
    assert repo["improve_progress"] == "Starting agent..."


def test_set_improve_status_default_on_create(tmp_path, monkeypatch):
    monkeypatch.setattr("app.storage.db.settings.db_path", tmp_path / "test.db")
    monkeypatch.setattr("app.storage.db.settings.storage_dir", tmp_path)
    init_db()
    create_repo("def456", "https://github.com/test/repo2")
    repo = get_repo("def456")
    assert repo["improve_status"] == "idle"
