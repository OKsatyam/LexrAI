import json
from dataclasses import asdict
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.pillars.improve_agent import (
    AgentState,
    bandit_node,
    decide_node,
    explain_node,
    radon_node,
    ruff_node,
    run_improve_agent,
)


FAKE_REPO_PATH = str(Path(__file__).parent / "fixtures" / "fake_repo")


def _base_state(**overrides) -> AgentState:
    state: AgentState = {
        "repo_id": "abc123",
        "repo_path": FAKE_REPO_PATH,
        "findings": [],
        "tools_run": [],
        "iterations": 0,
        "done": False,
        "next_tool": "",
        "final_findings": [],
    }
    state.update(overrides)
    return state


# --- decide_node ---

def test_decide_node_returns_next_tool():
    mock_llm = MagicMock()
    mock_llm.return_value = {"next_tool": "ruff"}
    with patch("app.pillars.improve_agent.get_llm", return_value=MagicMock()), \
         patch("app.pillars.improve_agent._decide_chain") as mock_chain, \
         patch("time.sleep"):
        mock_chain.invoke.return_value = {"next_tool": "ruff"}
        result = decide_node(_base_state())
    assert result["next_tool"] == "ruff"
    assert result["iterations"] == 1
    assert result["done"] is False


def test_decide_node_done_when_llm_says_done():
    with patch("app.pillars.improve_agent._decide_chain") as mock_chain, \
         patch("time.sleep"):
        mock_chain.invoke.return_value = {"next_tool": "done"}
        result = decide_node(_base_state())
    assert result["done"] is True


def test_decide_node_done_when_iterations_at_max():
    with patch("app.pillars.improve_agent._decide_chain") as mock_chain, \
         patch("time.sleep"):
        mock_chain.invoke.return_value = {"next_tool": "ruff"}
        result = decide_node(_base_state(iterations=4))
    # iterations becomes 5 = max, router will send to explain
    assert result["iterations"] == 5


# --- tool nodes ---

def test_ruff_node_appends_findings():
    from app.analysis.tools import Finding
    fake_findings = [Finding(tool="ruff", file="a.py", line=1, severity="warning", message="W001")]
    with patch("app.pillars.improve_agent.run_ruff", return_value=fake_findings):
        result = ruff_node(_base_state())
    assert len(result["findings"]) == 1
    assert result["findings"][0]["tool"] == "ruff"
    assert "ruff" in result["tools_run"]


def test_bandit_node_appends_findings():
    from app.analysis.tools import Finding
    fake_findings = [Finding(tool="bandit", file="b.py", line=5, severity="medium", message="B101")]
    with patch("app.pillars.improve_agent.run_bandit", return_value=fake_findings):
        result = bandit_node(_base_state())
    assert result["findings"][0]["tool"] == "bandit"
    assert "bandit" in result["tools_run"]


def test_radon_node_appends_findings():
    from app.analysis.tools import Finding
    fake_findings = [Finding(tool="radon", file="c.py", line=10, severity="high", message="complexity 15")]
    with patch("app.pillars.improve_agent.run_radon", return_value=fake_findings):
        result = radon_node(_base_state())
    assert result["findings"][0]["tool"] == "radon"
    assert "radon" in result["tools_run"]


# --- explain_node ---

def test_explain_node_calls_generate_improve():
    from app.analysis.tools import Finding
    fake_finding = {"tool": "ruff", "file": "a.py", "line": 1, "severity": "warning", "message": "W001"}
    explained = [dict(fake_finding, explanation="Fix this.")]
    with patch("app.pillars.improve_agent.generate_improve", return_value=explained):
        result = explain_node(_base_state(findings=[fake_finding]))
    assert result["final_findings"][0]["explanation"] == "Fix this."


# --- run_improve_agent integration ---

def test_run_improve_agent_returns_list(tmp_path):
    """Graph should complete and return a list (even if empty findings)."""
    decide_responses = [
        {"next_tool": "ruff"},
        {"next_tool": "done"},
    ]
    call_count = {"n": 0}

    def fake_decide_invoke(inputs):
        r = decide_responses[min(call_count["n"], len(decide_responses) - 1)]
        call_count["n"] += 1
        return r

    with patch("app.pillars.improve_agent._decide_chain") as mock_chain, \
         patch("app.pillars.improve_agent.run_ruff", return_value=[]), \
         patch("app.pillars.improve_agent.run_bandit", return_value=[]), \
         patch("app.pillars.improve_agent.run_radon", return_value=[]), \
         patch("app.pillars.improve_agent.generate_improve", return_value=[]), \
         patch("app.core.config.settings.repos_dir", tmp_path), \
         patch("time.sleep"):
        mock_chain.invoke.side_effect = fake_decide_invoke
        result = run_improve_agent("abc123")
    assert isinstance(result, list)
