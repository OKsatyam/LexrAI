# Phase 3 Design — LangGraph Agentic Improve Pipeline

**Date:** 2026-05-27
**Status:** Approved — ready for implementation
**Deadline:** June 10, 2026

---

## Overview

Replace the static `generate_improve()` pipeline with a LangGraph `StateGraph` agent. The agent uses a ReAct-style loop: an LLM decides which static analysis tool to invoke next, observes the results, and loops until done or iteration cap reached. LangSmith provides full node-by-node tracing.

---

## 1. StateGraph Architecture

### State

```python
class AgentState(TypedDict):
    repo_id: str
    repo_path: str
    findings: list[dict]       # accumulated across all tool runs
    tools_run: list[str]       # e.g. ["ruff", "bandit"]
    messages: list             # LLM conversation history (decide_node input)
    iterations: int            # incremented each decide_node call
    done: bool                 # LLM signals completion
    final_findings: list[dict] # with explanations, written to DB
```

### Nodes

| Node | Responsibility |
|---|---|
| `decide_node` | LLM receives current findings + tools already run → outputs next tool name (`"ruff"` / `"bandit"` / `"radon"`) or `"done"`. Increments `iterations`. Adds 2s delay before LLM call (rate-limit guard). |
| `ruff_node` | Runs `run_ruff(repo_path)` subprocess → appends findings to state, adds summary line to messages. |
| `bandit_node` | Runs `run_bandit(repo_path)` subprocess → same pattern. |
| `radon_node` | Runs `run_radon(repo_path)` subprocess → same pattern. |
| `explain_node` | Receives all accumulated findings → single LLM call generates explanations → writes `final_findings` to state. |

### Edges

```
START → decide_node

decide_node → ruff_node    (if next_tool == "ruff")
decide_node → bandit_node  (if next_tool == "bandit")
decide_node → radon_node   (if next_tool == "radon")
decide_node → explain_node (if done == True OR iterations >= 5)

ruff_node    → decide_node
bandit_node  → decide_node
radon_node   → decide_node

explain_node → END
```

### Loop bounds
- Hard cap: **5 iterations** (configurable via `settings`)
- Delay: **2s** before each `decide_node` LLM call
- Max LLM calls: 6 (5 × decide + 1 × explain) — safe within Groq 30 RPM

---

## 2. File Changes

### New files
```
backend/app/pillars/improve_agent.py   ← StateGraph definition + compile
```

### Modified files
```
backend/app/pillars/improve.py         ← keep generate_improve() for backward compat;
                                          add run_improve_agent() that calls improve_agent.py
backend/app/api/improve.py             ← add POST /improve (async job trigger)
                                          add GET /improve/{repo_id}/status
                                          keep GET /improve (unchanged)
backend/app/storage/db.py              ← add improve_status column to repos table
backend/app/core/config.py             ← set LANGCHAIN_* env vars for LangSmith tracing
                                          add improve_max_iterations: int = 5
frontend/app/components/ImprovePanel.tsx ← full redesign: idle → running (log) → done
```

### No changes needed
```
backend/app/analysis/tools.py   ← tool functions used as-is by agent nodes
backend/app/pillars/understand.py
backend/app/pillars/explore.py
eval/harness.py                 ← phase3 section added separately
```

---

## 3. API Contract

### New endpoints

```
POST /improve
  Body:    { "repo_id": "1f527efd5350" }
  Returns: { "repo_id": "1f527efd5350" }
  Effect:  Sets improve_status = "pending", kicks off background task

GET /improve/{repo_id}/status
  Returns: { "status": "pending|running|done|failed", "progress": "<current step>" }

GET /improve?repo_id=...   (UNCHANGED)
  Returns: { "repo_id": "...", "findings": [...] }
  Note:    POST /improve clears the improve column (sets to null) and sets
           improve_status = "pending". GET returns [] until agent writes results.
           Previous Phase 1/2 findings are replaced when agent completes.
```

### DB schema change

```sql
ALTER TABLE repos ADD COLUMN improve_status TEXT DEFAULT 'done';
```

Migration runs once at server startup (safe — adds column, sets existing rows to `'done'` since Phase 1/2 pre-generated findings are already stored).

---

## 4. LangSmith Tracing

Set in `config.py` immediately after `settings = Settings()`, before any LangChain import resolves:

```python
import os
os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
os.environ.setdefault("LANGCHAIN_API_KEY", settings.langsmith_api_key)
os.environ.setdefault("LANGCHAIN_PROJECT", settings.langsmith_project)
```

**Ordering matters:** `main.py` imports `config` before importing any LangChain/LangGraph module, so env vars are set before LangSmith client initializes. `.env` already has `LANGSMITH_API_KEY` and `LANGSMITH_PROJECT=lexrai`. No graph-level changes needed — LangGraph instruments all nodes automatically when tracing is active.

---

## 5. Frontend — ImprovePanel.tsx

### States

| State | Trigger | UI |
|---|---|---|
| `idle` | Component mounts, no job running | "Run Analysis" button |
| `running` | After POST /improve | Terminal-style agent log, iteration dot bar |
| `done` | Status = "done" | Severity pill summary + finding cards |
| `error` | Status = "failed" | Error message + retry button |

### Design
- Font: JetBrains Mono for log/code elements, Inter for body text
- Tool colors: purple=decide, green=ruff, amber=bandit, red=radon
- Finding cards: left-border color encodes severity (red=high, orange=medium, blue=low)
- Agent log: polls GET /improve/{repo_id}/status every 2s, appends each new progress message as a new log line
- Iteration bar: 5 dots, filled left to right as iterations complete

### Polling
- Start polling on POST /improve success
- Poll GET /improve/{repo_id}/status every 2s
- On `done`: fetch GET /improve?repo_id=... for findings, stop polling
- On `failed`: show error, stop polling

---

## 6. Evaluation

### What changes
`eval/harness.py` gets a `run_phase_3()` function that:
1. Triggers POST /improve for each gold-set repo (waits for completion)
2. Fetches final findings
3. Records comparison table vs Phase 2 single-shot results

### Metrics recorded in `eval/results/phase3_results.json`

| Metric | Source |
|---|---|
| Total findings | Count from agent run |
| By tool / by severity | Breakdown |
| LLM calls used | Logged from agent state (`iterations + 1`) |
| Iterations used | From agent state |
| Explanation coverage | % with non-empty explanation |
| Retrieval Hit@k / MRR | Carry from Phase 2 (unchanged) |
| Understand rubric | Carry from Phase 2 (unchanged) |

### Headline comparison
Side-by-side table: Phase 2 single-shot vs Phase 3 agentic — findings count, tool mix, explanation quality.

---

## 7. Rate-Limit Budget

Per `/improve` run (worst case, 5 iterations):
- 5 × `decide_node` calls = 5 Groq calls (2s delay between each)
- 1 × `explain_node` call = 1 Groq call
- Total: 6 calls, ~12s minimum (due to delays)
- Groq limit: 30 RPM → safe as long as one run at a time

---

## 8. Out of Scope

- Streaming agent log via WebSocket (polling is sufficient for demo)
- Per-file deep analysis (agent only decides which tool, not which files)
- Production UI polish (deferred post-demo)
- Deployment beyond localhost
