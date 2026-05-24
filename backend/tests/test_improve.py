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
        mock_chain = MagicMock()
        mock_chain.invoke.return_value = explained
        mock_llm = MagicMock()
        mock_llm.__or__ = MagicMock(return_value=mock_chain)
        mock_get_llm.return_value = mock_llm

        with patch("app.pillars.improve._PROMPT") as mock_prompt:
            mock_prompt.__or__ = MagicMock(return_value=mock_chain)
            result = generate_improve(FINDINGS)

    assert isinstance(result, list)


def test_caps_at_max_findings():
    many = [Finding("ruff", "f.py", i, "warning", "msg") for i in range(30)]
    with patch("app.pillars.improve.get_llm") as mock_get_llm:
        mock_chain = MagicMock()
        mock_chain.invoke.return_value = [{"index": i, "explanation": "x"} for i in range(1, 21)]
        mock_get_llm.return_value = MagicMock()

        with patch("app.pillars.improve._PROMPT") as mock_prompt:
            mock_prompt.__or__ = MagicMock(return_value=mock_chain)
            result = generate_improve(many)

    assert len(result) <= 20
