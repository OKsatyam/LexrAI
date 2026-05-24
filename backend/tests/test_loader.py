import subprocess
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.ingestion.loader import load_repo


@pytest.fixture
def tmp_repo(tmp_path):
    py_file = tmp_path / "main.py"
    py_file.write_text("def hello():\n    return 'hello'\n")
    (tmp_path / "README.md").write_text("# test repo")
    return tmp_path


def test_load_repo_returns_documents(tmp_path, monkeypatch, tmp_repo):
    from app.core import config
    monkeypatch.setattr(config.settings, "repos_dir", tmp_path / "repos")

    with patch("app.ingestion.loader._clone_repo", return_value=tmp_repo):
        docs = load_repo("abc123", "https://github.com/user/repo")

    assert len(docs) >= 1
    assert all(hasattr(d, "page_content") for d in docs)
    assert all(hasattr(d, "metadata") for d in docs)


def test_load_repo_filters_python_only(tmp_path, monkeypatch, tmp_repo):
    from app.core import config
    monkeypatch.setattr(config.settings, "repos_dir", tmp_path / "repos")

    with patch("app.ingestion.loader._clone_repo", return_value=tmp_repo):
        docs = load_repo("abc123", "https://github.com/user/repo")

    sources = [d.metadata.get("source", "") for d in docs]
    assert all(s.endswith(".py") for s in sources)
