import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.analysis.tools import Finding, run_all, run_bandit, run_ruff, run_radon


def mock_run(stdout):
    result = MagicMock()
    result.stdout = stdout
    result.returncode = 0
    return result


def test_run_ruff_returns_findings():
    output = json.dumps([{
        "code": "E501",
        "filename": "main.py",
        "location": {"row": 10, "column": 0},
        "message": "Line too long",
    }])
    with patch("subprocess.run", return_value=mock_run(output)):
        findings = run_ruff(Path("/fake/repo"))
    assert len(findings) == 1
    assert findings[0].tool == "ruff"
    assert findings[0].line == 10


def test_run_bandit_returns_findings():
    output = json.dumps({"results": [{
        "filename": "main.py",
        "line_number": 5,
        "issue_severity": "HIGH",
        "issue_text": "Use of assert detected",
    }]})
    with patch("subprocess.run", return_value=mock_run(output)):
        findings = run_bandit(Path("/fake/repo"))
    assert len(findings) == 1
    assert findings[0].tool == "bandit"
    assert findings[0].severity == "high"


def test_run_radon_returns_findings():
    output = json.dumps({"main.py": [{
        "name": "complex_func",
        "lineno": 20,
        "complexity": 15,
        "rank": "C",
    }]})
    with patch("subprocess.run", return_value=mock_run(output)):
        findings = run_radon(Path("/fake/repo"))
    assert len(findings) == 1
    assert findings[0].tool == "radon"
    assert findings[0].severity == "high"


def test_run_all_combines_findings():
    with patch("app.analysis.tools.run_ruff", return_value=[Finding("ruff", "a.py", 1, "warning", "msg")]), \
         patch("app.analysis.tools.run_bandit", return_value=[Finding("bandit", "b.py", 2, "high", "msg")]), \
         patch("app.analysis.tools.run_radon", return_value=[]):
        findings = run_all(Path("/fake/repo"))
    assert len(findings) == 2


def test_invalid_json_returns_empty():
    with patch("subprocess.run", return_value=mock_run("not json")):
        assert run_ruff(Path("/fake/repo")) == []
        assert run_bandit(Path("/fake/repo")) == []
