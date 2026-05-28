from unittest.mock import MagicMock, patch

import pytest

from app.analysis.tools import Finding
from app.pillars.improve import generate_improve, _prioritize, _format_findings

FINDINGS = [
    Finding("ruff", "main.py", 10, "warning", "Line too long"),
    Finding("bandit", "auth.py", 5, "high", "Hardcoded password"),
    Finding("radon", "utils.py", 20, "medium", "complexity 8"),
]


def test_generate_improve_empty():
    assert generate_improve([]) == []


def test_prioritize_orders_by_severity():
    ordered = _prioritize(FINDINGS)
    assert ordered[0].severity == "high"


def test_format_findings():
    text = _format_findings(FINDINGS)
    assert "1." in text
    assert "RUFF" in text
    assert "BANDIT" in text


def test_generate_improve_calls_llm():
    explained = [
        {"index": 1, "explanation": "Fix the password issue."},
        {"index": 2, "explanation": "Shorten the line."},
        {"index": 3, "explanation": "Reduce complexity."},
    ]
    with patch("app.pillars.improve.get_llm") as mock_get_llm:
        mock_llm = MagicMock()
        mock_get_llm.return_value = mock_llm

        with patch("app.pillars.improve._PROMPT") as mock_prompt:
            mock_chain = MagicMock()
            mock_chain.invoke.return_value = explained
            # Fix: | on mock_chain must return mock_chain so the full LCEL chain stays mockable
            mock_chain.__or__ = MagicMock(return_value=mock_chain)
            mock_prompt.__or__ = MagicMock(return_value=mock_chain)

            result = generate_improve(FINDINGS)

    assert isinstance(result, list)
    assert len(result) == 3


def test_caps_at_max_findings():
    many = [Finding("ruff", "f.py", i, "warning", "msg") for i in range(30)]
    with patch("app.pillars.improve.get_llm") as mock_get_llm:
        mock_llm = MagicMock()
        mock_get_llm.return_value = mock_llm

        with patch("app.pillars.improve._PROMPT") as mock_prompt:
            mock_chain = MagicMock()
            mock_chain.invoke.return_value = [{"index": i, "explanation": "x"} for i in range(1, 21)]
            mock_chain.__or__ = MagicMock(return_value=mock_chain)
            mock_prompt.__or__ = MagicMock(return_value=mock_chain)
            result = generate_improve(many)

    assert len(result) <= 20


# --- API endpoint tests ---

import hashlib as _hashlib
from fastapi import FastAPI as _FastAPI
from fastapi.testclient import TestClient as _TestClient
from unittest.mock import patch as _patch

from app.api.improve import router as _improve_router

_app = _FastAPI()
_app.include_router(_improve_router)
_api_client = _TestClient(_app, raise_server_exceptions=False)


def test_trigger_improve_returns_202():
    import json
    from app.storage.db import init_db, create_repo, update_repo_summaries, set_improve_status
    import tempfile, os
    from pathlib import Path

    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        tmp_path = Path(tmp)
        with _patch("app.storage.db.settings.db_path", tmp_path / "test.db"), \
             _patch("app.storage.db.settings.storage_dir", tmp_path), \
             _patch("app.api.improve.get_repo") as mock_get, \
             _patch("app.api.improve.set_improve_status"), \
             _patch("app.api.improve.run_improve_agent", return_value=[]):
            repo_id = "abc123test00"
            mock_get.return_value = {"repo_id": repo_id, "status": "done", "understand": "", "improve": "[]"}
            resp = _api_client.post("/improve", json={"repo_id": repo_id})
        assert resp.status_code == 202
        assert resp.json()["repo_id"] == repo_id


def test_improve_status_endpoint():
    with _patch("app.api.improve.get_repo") as mock_get:
        mock_get.return_value = {
            "repo_id": "abc123",
            "status": "done",
            "improve_status": "running",
            "improve_progress": "Agent running...",
        }
        resp = _api_client.get("/improve/abc123/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "running"
    assert "progress" in data


def test_improve_status_404_unknown_repo():
    with _patch("app.api.improve.get_repo", return_value=None):
        resp = _api_client.get("/improve/doesnotexist/status")
    assert resp.status_code == 404


def test_get_improve_returns_findings():
    import json
    with _patch("app.api.improve.get_repo") as mock_get:
        mock_get.return_value = {
            "repo_id": "abc123",
            "status": "done",
            "improve": json.dumps([{
                "tool": "ruff", "file": "a.py", "line": 1,
                "severity": "warning", "message": "W001", "explanation": "Fix it."
            }]),
        }
        resp = _api_client.get("/improve?repo_id=abc123")
    assert resp.status_code == 200
    assert len(resp.json()["findings"]) == 1
