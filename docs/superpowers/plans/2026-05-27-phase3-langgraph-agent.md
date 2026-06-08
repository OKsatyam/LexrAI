# Phase 3 — LangGraph Agentic Improve Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static Improve pipeline with a LangGraph ReAct-style StateGraph agent that selects static analysis tools intelligently, with LangSmith tracing and an async API + redesigned frontend.

**Architecture:** A `StateGraph` with `decide_node` (LLM picks next tool), three tool nodes (`ruff_node`, `bandit_node`, `radon_node`), and `explain_node` (LLM writes explanations). Conditional edges route from `decide_node` back to a tool or forward to `explain_node`. The graph runs as a FastAPI background task, writing results to SQLite when done. A new `improve_status` DB column tracks job state separately from ingest status.

**Tech Stack:** Python 3.12, FastAPI BackgroundTasks, LangGraph `StateGraph`, LangChain LCEL, Groq LLM, LangSmith tracing, Next.js 16 + React 19 + Tailwind CSS v4, JetBrains Mono font (CDN).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `backend/requirements.txt` | Add `langgraph` |
| Modify | `backend/app/core/config.py` | LangSmith env vars, `improve_max_iterations` |
| Modify | `backend/app/storage/db.py` | `improve_status`/`improve_progress` columns + helper fns |
| Modify | `backend/tests/test_db.py` | Tests for new DB helpers |
| **Create** | `backend/app/pillars/improve_agent.py` | StateGraph definition + `run_improve_agent()` |
| **Create** | `backend/tests/test_improve_agent.py` | Tests for agent nodes + graph |
| Modify | `backend/app/api/improve.py` | POST /improve + GET /improve/{id}/status |
| Modify | `backend/tests/test_improve.py` | Tests for new endpoints |
| Modify | `frontend/app/components/ImprovePanel.tsx` | Full redesign: idle→running→done→error |
| Modify | `eval/harness.py` | `run_phase_3()` |

---

## Task 1: Install langgraph

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add langgraph to requirements.txt**

Open `backend/requirements.txt`. After the `langchain-google-genai` line, add:

```
langgraph==0.2.55
```

- [ ] **Step 2: Install**

```bash
cd backend
pip install langgraph==0.2.55
```

Expected: resolves without conflicts. If version conflict, use `pip install langgraph` (latest compatible).

- [ ] **Step 3: Verify import**

```bash
python -c "from langgraph.graph import StateGraph, END; print('ok')"
```

Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add backend/requirements.txt
git commit -m "chore: add langgraph dependency"
```

---

## Task 2: Config — LangSmith + improve_max_iterations

**Files:**
- Modify: `backend/app/core/config.py`

- [ ] **Step 1: Update config.py**

Replace the entire file content with:

```python
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class Settings:
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    langsmith_api_key: str = os.getenv("LANGSMITH_API_KEY", "")
    langsmith_project: str = os.getenv("LANGSMITH_PROJECT", "lexrai")
    improve_max_iterations: int = 5

    # Storage paths — relative to backend/storage/
    storage_dir: Path = Path(__file__).parent.parent.parent / "storage"
    repos_dir: Path = storage_dir / "repos"
    chroma_dir: Path = storage_dir / "chroma"
    db_path: Path = storage_dir / "lexrai.db"


settings = Settings()

# LangSmith tracing — must be set before any LangChain import resolves.
# main.py imports config first, so these are set at process startup.
if settings.langsmith_api_key:
    os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    os.environ.setdefault("LANGCHAIN_API_KEY", settings.langsmith_api_key)
    os.environ.setdefault("LANGCHAIN_PROJECT", settings.langsmith_project)
```

- [ ] **Step 2: Add LANGCHAIN env vars to .env**

Open `backend/.env` (or root `.env`). Add these lines if not present:

```
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=lexrai
```

(LANGCHAIN_API_KEY is set from LANGSMITH_API_KEY in code — no duplicate needed.)

- [ ] **Step 3: Verify config loads**

```bash
cd backend
python -c "from app.core.config import settings; print(settings.improve_max_iterations)"
```

Expected: `5`

- [ ] **Step 4: Commit**

```bash
git add backend/app/core/config.py .env
git commit -m "feat: LangSmith tracing config + improve_max_iterations setting"
```

---

## Task 3: DB migration — improve_status column

**Files:**
- Modify: `backend/app/storage/db.py`
- Modify: `backend/tests/test_db.py`

- [ ] **Step 1: Write failing tests first**

Open `backend/tests/test_db.py`. Add at the end:

```python
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
```

Also add `set_improve_status` to the import at the top of `test_db.py`:
```python
from app.storage.db import (
    init_db, create_repo, get_repo, update_repo_status,
    update_repo_summaries, set_improve_status,
)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
pytest tests/test_db.py::test_set_improve_status_and_get tests/test_db.py::test_set_improve_status_default_on_create -v
```

Expected: `ImportError` or `AttributeError` — `set_improve_status` not defined.

- [ ] **Step 3: Implement DB changes**

Replace `backend/app/storage/db.py` with:

```python
import sqlite3
from datetime import datetime
from typing import Optional

from app.core.config import settings


def _connect() -> sqlite3.Connection:
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS repos (
                repo_id         TEXT PRIMARY KEY,
                github_url      TEXT NOT NULL,
                status          TEXT NOT NULL DEFAULT 'pending',
                understand      TEXT,
                improve         TEXT,
                ingested_at     TEXT,
                improve_status  TEXT NOT NULL DEFAULT 'idle',
                improve_progress TEXT NOT NULL DEFAULT ''
            )
        """)
        # Migration: add columns to existing DBs that lack them
        for col, default in [
            ("improve_status", "'idle'"),
            ("improve_progress", "''"),
        ]:
            try:
                conn.execute(
                    f"ALTER TABLE repos ADD COLUMN {col} TEXT NOT NULL DEFAULT {default}"
                )
            except sqlite3.OperationalError:
                pass  # column already exists
        conn.commit()


def create_repo(repo_id: str, github_url: str) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO repos (repo_id, github_url, status) VALUES (?, ?, 'pending')",
            (repo_id, github_url),
        )
        conn.commit()


def get_repo(repo_id: str) -> Optional[dict]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM repos WHERE repo_id = ?", (repo_id,)
        ).fetchone()
        return dict(row) if row else None


def update_repo_status(repo_id: str, status: str) -> None:
    with _connect() as conn:
        conn.execute(
            "UPDATE repos SET status = ? WHERE repo_id = ?",
            (status, repo_id),
        )
        conn.commit()


def update_repo_summaries(repo_id: str, understand: str, improve: str) -> None:
    with _connect() as conn:
        conn.execute(
            """UPDATE repos
               SET understand = ?, improve = ?, status = 'done', ingested_at = ?
               WHERE repo_id = ?""",
            (understand, improve, datetime.utcnow().isoformat(), repo_id),
        )
        conn.commit()


def set_improve_status(repo_id: str, status: str, progress: str) -> None:
    with _connect() as conn:
        conn.execute(
            "UPDATE repos SET improve_status = ?, improve_progress = ? WHERE repo_id = ?",
            (status, progress, repo_id),
        )
        conn.commit()
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd backend
pytest tests/test_db.py -v
```

Expected: all pass (including the 2 new ones).

- [ ] **Step 5: Run full suite — expect no regressions**

```bash
pytest tests/ -v
```

Expected: 59 passed (57 existing + 2 new).

- [ ] **Step 6: Commit**

```bash
git add backend/app/storage/db.py backend/tests/test_db.py
git commit -m "feat: add improve_status column to DB + set_improve_status helper"
```

---

## Task 4: improve_agent.py — StateGraph

**Files:**
- Create: `backend/app/pillars/improve_agent.py`
- Create: `backend/tests/test_improve_agent.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_improve_agent.py`:

```python
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
```

- [ ] **Step 2: Run tests — expect fail**

```bash
cd backend
pytest tests/test_improve_agent.py -v
```

Expected: `ImportError` — `improve_agent` module not found.

- [ ] **Step 3: Create improve_agent.py**

Create `backend/app/pillars/improve_agent.py`:

```python
import time
from dataclasses import asdict
from pathlib import Path
from typing import TypedDict

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import END, StateGraph

from app.analysis.tools import Finding, run_bandit, run_radon, run_ruff
from app.core.config import settings
from app.core.llm import get_llm
from app.pillars.improve import generate_improve

_DECIDE_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a code quality analysis agent. Select the next static analysis tool "
        "to run, or declare analysis complete. Respond with valid JSON only.",
    ),
    (
        "human",
        "Tools available: {tools_available}\n"
        "Tools already run: {tools_run}\n"
        "Findings so far: {n_findings} issues found\n\n"
        "Which tool should run next? Or respond 'done' if analysis is complete.\n\n"
        'Respond with JSON only: {{"next_tool": "<tool_name_or_done>"}}',
    ),
])

_decide_chain = _DECIDE_PROMPT | get_llm() | JsonOutputParser()

_ALL_TOOLS = ["ruff", "bandit", "radon"]


class AgentState(TypedDict):
    repo_id: str
    repo_path: str
    findings: list[dict]
    tools_run: list[str]
    iterations: int
    done: bool
    next_tool: str
    final_findings: list[dict]


def decide_node(state: AgentState) -> dict:
    time.sleep(2)  # rate-limit guard: 2s between LLM calls
    tools_available = [t for t in _ALL_TOOLS if t not in state["tools_run"]]
    result = _decide_chain.invoke({
        "tools_available": tools_available or ["none"],
        "tools_run": state["tools_run"],
        "n_findings": len(state["findings"]),
    })
    next_tool = result.get("next_tool", "done")
    done = next_tool == "done" or next_tool not in tools_available
    return {
        "next_tool": next_tool if not done else "done",
        "done": done,
        "iterations": state["iterations"] + 1,
    }


def _tool_result(state: AgentState, findings: list[Finding], tool_name: str) -> dict:
    return {
        "findings": state["findings"] + [asdict(f) for f in findings],
        "tools_run": state["tools_run"] + [tool_name],
    }


def ruff_node(state: AgentState) -> dict:
    return _tool_result(state, run_ruff(Path(state["repo_path"])), "ruff")


def bandit_node(state: AgentState) -> dict:
    return _tool_result(state, run_bandit(Path(state["repo_path"])), "bandit")


def radon_node(state: AgentState) -> dict:
    return _tool_result(state, run_radon(Path(state["repo_path"])), "radon")


def explain_node(state: AgentState) -> dict:
    findings_obj = [Finding(**f) for f in state["findings"][:20]]
    explained = generate_improve(findings_obj)
    return {"final_findings": explained}


def _route_from_decide(state: AgentState) -> str:
    if state["done"] or state["iterations"] >= settings.improve_max_iterations:
        return "explain"
    tool = state["next_tool"]
    return tool if tool in _ALL_TOOLS else "explain"


def _build_graph() -> StateGraph:
    builder = StateGraph(AgentState)
    builder.add_node("decide", decide_node)
    builder.add_node("ruff", ruff_node)
    builder.add_node("bandit", bandit_node)
    builder.add_node("radon", radon_node)
    builder.add_node("explain", explain_node)
    builder.set_entry_point("decide")
    builder.add_conditional_edges(
        "decide",
        _route_from_decide,
        {"ruff": "ruff", "bandit": "bandit", "radon": "radon", "explain": "explain"},
    )
    for tool in _ALL_TOOLS:
        builder.add_edge(tool, "decide")
    builder.add_edge("explain", END)
    return builder.compile()


_graph = _build_graph()


def run_improve_agent(repo_id: str) -> list[dict]:
    repo_path = str(settings.repos_dir / repo_id)
    initial: AgentState = {
        "repo_id": repo_id,
        "repo_path": repo_path,
        "findings": [],
        "tools_run": [],
        "iterations": 0,
        "done": False,
        "next_tool": "",
        "final_findings": [],
    }
    final_state = _graph.invoke(initial)
    return final_state["final_findings"]
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd backend
pytest tests/test_improve_agent.py -v
```

Expected: all pass.

- [ ] **Step 5: Run full suite — no regressions**

```bash
pytest tests/ -v
```

Expected: 66 passed (59 existing + 7 new).

- [ ] **Step 6: Commit**

```bash
git add backend/app/pillars/improve_agent.py backend/tests/test_improve_agent.py
git commit -m "feat: LangGraph ReAct agent for Improve — StateGraph with decide/tool/explain nodes"
```

---

## Task 5: api/improve.py — async endpoints

**Files:**
- Modify: `backend/app/api/improve.py`
- Modify: `backend/tests/test_improve.py`

- [ ] **Step 1: Write failing tests**

Open `backend/tests/test_improve.py`. Add at the end:

```python
def test_trigger_improve_returns_repo_id(client, mock_llm):
    from unittest.mock import patch
    with patch("app.api.improve.run_improve_agent", return_value=[]), \
         patch("app.api.improve.set_improve_status"):
        # First ensure repo exists and is done
        client.post("/ingest", json={"github_url": "https://github.com/test/repo"})
        # Manually mark as done in db for this test
        from app.storage.db import update_repo_summaries, get_repo
        import hashlib, json
        repo_id = hashlib.md5(b"https://github.com/test/repo").hexdigest()[:12]
        update_repo_summaries(repo_id, "summary", json.dumps([]))
        resp = client.post("/improve", json={"repo_id": repo_id})
        assert resp.status_code == 202
        assert resp.json()["repo_id"] == repo_id


def test_improve_status_endpoint(client, mock_llm):
    import hashlib, json
    from app.storage.db import update_repo_summaries, set_improve_status
    repo_id = hashlib.md5(b"https://github.com/test/repo").hexdigest()[:12]
    # ensure repo exists
    from app.storage.db import create_repo
    create_repo(repo_id, "https://github.com/test/repo")
    update_repo_summaries(repo_id, "summary", json.dumps([]))
    set_improve_status(repo_id, "running", "Starting agent...")
    resp = client.get(f"/improve/{repo_id}/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "running"
    assert data["progress"] == "Starting agent..."


def test_improve_status_404_unknown_repo(client):
    resp = client.get("/improve/doesnotexist/status")
    assert resp.status_code == 404
```

- [ ] **Step 2: Run tests — expect fail**

```bash
cd backend
pytest tests/test_improve.py::test_trigger_improve_returns_repo_id tests/test_improve.py::test_improve_status_endpoint tests/test_improve.py::test_improve_status_404_unknown_repo -v
```

Expected: FAIL — POST /improve not found (405) or 422.

- [ ] **Step 3: Rewrite api/improve.py**

Replace `backend/app/api/improve.py` with:

```python
import json

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.pillars.improve_agent import run_improve_agent
from app.storage.db import get_repo, set_improve_status, update_repo_summaries

router = APIRouter(prefix="/improve", tags=["improve"])

_PROGRESS = {
    "idle":    "Not started",
    "pending": "Queued",
    "running": "Agent running...",
    "done":    "Complete",
    "failed":  "Failed",
}


class Finding(BaseModel):
    tool: str
    file: str
    line: int
    severity: str
    message: str
    explanation: str


class ImproveRequest(BaseModel):
    repo_id: str


class ImproveResponse(BaseModel):
    repo_id: str
    findings: list[Finding]


class ImproveStatusResponse(BaseModel):
    status: str
    progress: str


def _run_improve_job(repo_id: str) -> None:
    set_improve_status(repo_id, "running", "Agent running...")
    try:
        findings = run_improve_agent(repo_id)
        # Write findings back to improve column; preserve understand
        repo = get_repo(repo_id)
        update_repo_summaries(
            repo_id,
            understand=repo["understand"] or "",
            improve=json.dumps(findings),
        )
        set_improve_status(repo_id, "done", "Complete")
    except Exception as exc:
        set_improve_status(repo_id, "failed", str(exc)[:200])


@router.post("", status_code=202)
async def trigger_improve(request: ImproveRequest, background_tasks: BackgroundTasks):
    repo = get_repo(request.repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail=f"Repo {request.repo_id} not found")
    if repo["status"] != "done":
        raise HTTPException(
            status_code=409,
            detail=f"Repo not ready. Current status: {repo['status']}",
        )
    set_improve_status(request.repo_id, "pending", "Queued")
    background_tasks.add_task(_run_improve_job, request.repo_id)
    return {"repo_id": request.repo_id}


@router.get("/{repo_id}/status", response_model=ImproveStatusResponse)
async def improve_status(repo_id: str):
    repo = get_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail=f"Repo {repo_id} not found")
    status = repo.get("improve_status", "idle")
    return ImproveStatusResponse(
        status=status,
        progress=_PROGRESS.get(status, status),
    )


@router.get("", response_model=ImproveResponse)
async def improve(repo_id: str):
    repo = get_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail=f"Repo {repo_id} not found")
    if repo["status"] != "done":
        raise HTTPException(
            status_code=409,
            detail=f"Repo not ready. Current status: {repo['status']}",
        )
    findings = json.loads(repo["improve"] or "[]")
    return ImproveResponse(repo_id=repo_id, findings=findings)
```

- [ ] **Step 4: Run new tests — expect pass**

```bash
cd backend
pytest tests/test_improve.py -v
```

Expected: all pass.

- [ ] **Step 5: Full suite**

```bash
pytest tests/ -v
```

Expected: 69 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/improve.py backend/tests/test_improve.py
git commit -m "feat: async POST /improve + GET /improve/{id}/status endpoints"
```

---

## Task 6: ImprovePanel.tsx — redesign

**Files:**
- Modify: `frontend/app/components/ImprovePanel.tsx`

- [ ] **Step 1: Replace ImprovePanel.tsx**

Replace the entire file with:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

const API = "http://localhost:8000";

interface Finding {
  tool: string;
  file: string;
  line: number;
  severity: string;
  message: string;
  explanation: string;
}

interface LogLine {
  time: string;
  tag: string;
  tagColor: string;
  msg: string;
}

interface Props {
  repoId: string;
}

const SEV_BORDER: Record<string, string> = {
  high:    "border-l-red-500",
  error:   "border-l-red-500",
  medium:  "border-l-orange-500",
  warning: "border-l-orange-500",
  low:     "border-l-blue-500",
};

const SEV_BADGE: Record<string, string> = {
  high:    "bg-red-950 text-red-400 border-red-800",
  error:   "bg-red-950 text-red-400 border-red-800",
  medium:  "bg-orange-950 text-orange-400 border-orange-800",
  warning: "bg-orange-950 text-orange-400 border-orange-800",
  low:     "bg-blue-950 text-blue-400 border-blue-800",
};

function now() {
  const d = new Date();
  return `${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

type PanelState = "idle" | "running" | "done" | "error";

export default function ImprovePanel({ repoId }: Props) {
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [log, setLog] = useState<LogLine[]>([]);
  const [iterations, setIterations] = useState(0);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const appendLog = (tag: string, tagColor: string, msg: string) =>
    setLog(prev => [...prev, { time: now(), tag, tagColor, msg }]);

  const fetchFindings = async () => {
    const res = await fetch(`${API}/improve?repo_id=${repoId}`);
    const data = await res.json();
    setFindings(data.findings ?? []);
    setPanelState("done");
  };

  const startPolling = () => {
    stopPolling();
    let lastProgress = "";
    pollRef.current = setInterval(async () => {
      const res = await fetch(`${API}/improve/${repoId}/status`);
      const data = await res.json();
      const { status, progress } = data;

      if (progress !== lastProgress) {
        lastProgress = progress;
        const tag = progress.toLowerCase().includes("ruff")   ? "[ruff]"   :
                    progress.toLowerCase().includes("bandit") ? "[bandit]" :
                    progress.toLowerCase().includes("radon")  ? "[radon]"  :
                    progress.toLowerCase().includes("explain")? "[explain]": "[decide]";
        const color = tag === "[ruff]"    ? "text-emerald-400" :
                      tag === "[bandit]"  ? "text-amber-400"   :
                      tag === "[radon]"   ? "text-red-400"     :
                      tag === "[explain]" ? "text-purple-300"  : "text-violet-400";
        appendLog(tag, color, progress);
        if (/iteration (\d)/i.test(progress)) {
          const m = progress.match(/iteration (\d)/i);
          if (m) setIterations(parseInt(m[1]));
        }
      }

      if (status === "done") {
        stopPolling();
        appendLog("[done]", "text-emerald-400", "Analysis complete.");
        await fetchFindings();
      }
      if (status === "failed") {
        stopPolling();
        setErrorMsg(progress);
        setPanelState("error");
      }
    }, 2000);
  };

  const handleRun = async () => {
    setPanelState("running");
    setLog([]);
    setIterations(0);
    setFindings([]);
    appendLog("[start]", "text-violet-400", "Sending analysis request...");
    const res = await fetch(`${API}/improve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_id: repoId }),
    });
    if (!res.ok) {
      const d = await res.json();
      setErrorMsg(d.detail ?? "Failed to start.");
      setPanelState("error");
      return;
    }
    appendLog("[decide]", "text-violet-400", "Agent starting — selecting first tool...");
    startPolling();
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  useEffect(() => () => stopPolling(), []);

  const sevCounts = findings.reduce<Record<string, number>>((acc, f) => {
    const k = ["high","error"].includes(f.severity) ? "high" :
              ["medium","warning"].includes(f.severity) ? "medium" : "low";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">Improve</h2>

      {/* IDLE */}
      {panelState === "idle" && (
        <div>
          <p className="text-gray-400 text-sm mb-4">
            Run the AI agent to detect style, security, and complexity issues.
          </p>
          <button
            onClick={handleRun}
            className="flex items-center gap-2 bg-blue-950 border border-blue-800 text-blue-400 font-mono text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <polygon points="4,2 14,8 4,14"/>
            </svg>
            Run Analysis
          </button>
        </div>
      )}

      {/* RUNNING */}
      {panelState === "running" && (
        <div>
          <div className="bg-gray-950 rounded-lg p-3 font-mono text-xs leading-loose max-h-52 overflow-y-auto mb-3">
            {log.map((l, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-gray-600 min-w-[36px]">{l.time}</span>
                <span className={`font-semibold min-w-[60px] ${l.tagColor}`}>{l.tag}</span>
                <span className="text-gray-400">{l.msg}</span>
              </div>
            ))}
            {log.length > 0 && (
              <div className="flex gap-3">
                <span className="text-gray-600 min-w-[36px]">{now()}</span>
                <span className="text-violet-400 font-semibold min-w-[60px]">[decide]</span>
                <span className="text-gray-500 animate-pulse">thinking…</span>
              </div>
            )}
            <div ref={logEndRef}/>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-gray-500">iterations</span>
            <div className="flex gap-1.5">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < iterations ? "bg-emerald-400" :
                    i === iterations ? "bg-violet-400 animate-pulse" : "bg-gray-700"
                  }`}
                />
              ))}
            </div>
            <span className="font-mono text-xs text-gray-500">{iterations} / 5</span>
          </div>
        </div>
      )}

      {/* ERROR */}
      {panelState === "error" && (
        <div>
          <p className="text-red-400 text-sm mb-3">{errorMsg}</p>
          <button
            onClick={() => setPanelState("idle")}
            className="text-xs text-gray-400 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* DONE */}
      {panelState === "done" && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <span className="font-mono text-xs text-gray-500">
              {findings.length} finding{findings.length !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-2">
              {sevCounts.high   && <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800">HIGH {sevCounts.high}</span>}
              {sevCounts.medium && <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-orange-950 text-orange-400 border border-orange-800">MED {sevCounts.medium}</span>}
              {sevCounts.low    && <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800">LOW {sevCounts.low}</span>}
            </div>
          </div>

          {findings.length === 0 && (
            <p className="text-gray-400 text-sm">No findings — clean codebase.</p>
          )}

          <div className="space-y-3">
            {findings.map((f, i) => {
              const border = SEV_BORDER[f.severity] ?? "border-l-gray-600";
              const badge  = SEV_BADGE[f.severity]  ?? "bg-gray-800 text-gray-400 border-gray-700";
              return (
                <div key={i} className={`bg-gray-800 rounded-lg p-4 border-l-2 ${border} space-y-2`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badge}`}>
                      {f.severity.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 uppercase">{f.tool}</span>
                    <span className="text-[10px] font-mono text-gray-400 truncate max-w-xs">
                      {f.file.split(/[/\\]/).pop()}:{f.line}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200">{f.message}</p>
                  {f.explanation && (
                    <p className="text-xs text-gray-500 border-l-2 border-gray-700 pl-3 leading-relaxed">
                      {f.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => { setPanelState("idle"); setLog([]); setFindings([]); }}
            className="mt-4 text-xs text-gray-500 underline"
          >
            Run again
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add frontend/app/components/ImprovePanel.tsx
git commit -m "feat: redesign ImprovePanel — async job, live agent log, severity-coded findings"
```

---

## Task 7: eval/harness.py — run_phase_3()

**Files:**
- Modify: `eval/harness.py`

- [ ] **Step 1: Add run_phase_3() to harness.py**

Open `eval/harness.py`. Add this function before `main()`:

```python
def run_phase_3(base_url: str = "http://localhost:8000") -> None:
    """
    Phase 3 eval: trigger the agentic Improve pipeline via live server,
    wait for completion, compare results against Phase 2 single-shot.
    Requires the backend server to be running.
    """
    import time
    import urllib.request
    import urllib.error

    gold_sets = load_gold_sets()
    if not gold_sets:
        print("No gold sets found.")
        return

    all_results = []
    for gs in gold_sets:
        repo_id = gs["repo_id"]
        print(f"\nEvaluating repo: {repo_id}")

        # Trigger agent
        print("  Triggering POST /improve...")
        req = urllib.request.Request(
            f"{base_url}/improve",
            data=json.dumps({"repo_id": repo_id}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            urllib.request.urlopen(req)
        except urllib.error.HTTPError as e:
            print(f"  Error triggering: {e.code} {e.reason}")
            continue

        # Poll status
        print("  Polling status...")
        for _ in range(120):  # max 4 min
            time.sleep(2)
            with urllib.request.urlopen(f"{base_url}/improve/{repo_id}/status") as r:
                status_data = json.loads(r.read())
            print(f"    {status_data['status']}: {status_data['progress']}")
            if status_data["status"] in ("done", "failed"):
                break

        if status_data["status"] != "done":
            print(f"  Agent failed or timed out: {status_data}")
            continue

        # Fetch findings
        with urllib.request.urlopen(f"{base_url}/improve?repo_id={repo_id}") as r:
            findings_data = json.loads(r.read())
        findings = findings_data.get("findings", [])

        improve_summary = summarize_improve(findings)

        # Retrieval eval (same as phase 1 and 2)
        print("  Running retrieval eval...")
        retrieval = run_retrieval_eval(repo_id, gs["pairs"])

        result = {
            "repo_id": repo_id,
            "retrieval": retrieval,
            "improve_agentic": improve_summary,
            "note": "Compare improve_agentic vs phase2_results.json improve field for single-shot vs agentic diff",
        }
        all_results.append(result)
        print(f"  retrieval: {retrieval}")
        print(f"  improve:   {improve_summary}")

    RESULTS_DIR.mkdir(exist_ok=True)
    out = RESULTS_DIR / "phase3_results.json"
    out.write_text(json.dumps(all_results, indent=2))
    print(f"\nResults saved to {out}")
```

- [ ] **Step 2: Update main() to handle phase 3**

Find the `main()` function in `eval/harness.py`. Replace the else branch:

```python
    elif args.phase == 2:
        run_phase_2()
    elif args.phase == 3:
        run_phase_3()
    else:
        print(f"Phase {args.phase} harness not yet implemented.")
```

- [ ] **Step 3: Verify harness syntax**

```bash
cd "C:\Users\sk921\OneDrive\Desktop\LexrAi"
python -c "import eval.harness" 2>/dev/null || python -c "
import sys; sys.path.insert(0, 'eval')
import py_compile; py_compile.compile('eval/harness.py', doraise=True)
print('syntax ok')
"
```

Expected: `syntax ok`

- [ ] **Step 4: Commit**

```bash
git add eval/harness.py
git commit -m "feat: eval harness phase 3 — agentic vs single-shot Improve comparison"
```

---

## Task 8: End-to-end verification

- [ ] **Step 1: Run full test suite**

```bash
cd backend
pytest tests/ -v
```

Expected: 69 passed, 0 failed.

- [ ] **Step 2: Start backend**

```bash
uvicorn app.main:app --port 8000
```

Expected: starts clean, no import errors, LangSmith tracing enabled in logs.

- [ ] **Step 3: Trigger /improve on click repo**

```bash
curl -s -X POST http://localhost:8000/improve \
  -H "Content-Type: application/json" \
  -d '{"repo_id":"1f527efd5350"}'
```

Expected: `{"repo_id":"1f527efd5350"}` with HTTP 202.

- [ ] **Step 4: Poll status until done**

```bash
watch -n 3 'curl -s http://localhost:8000/improve/1f527efd5350/status'
```

(On Windows: repeat manually or run the eval harness instead.)

Expected: transitions pending → running → done.

- [ ] **Step 5: Verify findings returned**

```bash
curl -s "http://localhost:8000/improve?repo_id=1f527efd5350" | python -c "
import sys, json; d=json.load(sys.stdin)
print(f'{len(d[\"findings\"])} findings')
print(d['findings'][0])
"
```

Expected: findings list with explanations.

- [ ] **Step 6: Run Phase 3 eval (server must be running)**

```bash
cd "C:\Users\sk921\OneDrive\Desktop\LexrAi"
python eval/harness.py --phase 3
```

Expected: results saved to `eval/results/phase3_results.json`.

- [ ] **Step 7: Update context.md**

In `context.md`, update Current State:
- Phase: Phase 3 DONE
- Last completed: LangGraph agent implemented, eval ran
- Record phase 3 metrics in the Phase 3 section

- [ ] **Step 8: Final commit**

```bash
git add context.md eval/results/phase3_results.json
git commit -m "feat: Phase 3 complete — LangGraph agent, LangSmith tracing, eval recorded"
```
