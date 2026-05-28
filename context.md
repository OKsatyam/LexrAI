# context.md — LexrAI

Source of truth for *what* we're building. `CLAUDE.md` governs *how* we work.
Update after every meaningful change: new module, design decision, API/schema change, phase progress.

---

## Current State

- **Phase:** Phase 3 DONE — all three phases complete. Demo-ready.
- **Last completed:** Phase 3 LangGraph agent implemented and eval ran. Agent completes in 1–2 iterations for pallets/click. 20 findings (ruff + bandit), 100% explanation coverage, Hit@3=0.90 (unchanged), MRR=0.717.
- **Next:** Demo / submission. Optional polish: production UI, Tier 1 controlled repo, naive baseline fix.
- **Known minor issue:** `datetime.utcnow()` deprecation warning in `backend/app/storage/db.py:75` — non-blocking.
- **Naive baseline:** harness skips naive comparison because `load_repo` lacks `__wrapped__` — fix before final report.
- **Precision/recall:** Needs Tier 1 controlled repo with planted bugs — deferred post-demo.

---

## Project

LexrAI — AI-powered codebase orientation. Developer points it at a GitHub repo and gets:

- **Understand** — auto-generated repo summary
- **Explore** — grounded Q&A over the codebase
- **Improve** — static-analysis-backed findings with LLM explanations

---

## Tech Stack

| Layer | Choice |
|---|---|
| Language | Python 3.12 |
| Package manager | pip |
| Backend | FastAPI |
| Orchestration | LangChain (Phase 1–2), LangGraph (Phase 3) |
| Vector store | Chroma (local) |
| Embeddings | jina-embeddings-v2-base-code (primary); all-MiniLM-L6-v2 (eval baseline only) |
| LLM primary | Groq — `llama-3.3-70b-versatile` (30 RPM) |
| LLM fallback | Gemini — `gemini-1.5-flash` (15 RPM) |
| LLM isolation | Single `get_llm()` in `backend/app/core/llm.py` |
| Static analysis | Ruff, Bandit, Radon — subprocess calls, JSON output |
| Frontend | Next.js (App Router) |
| Observability | LangSmith (Phase 3 only) |
| Repo layout | Monorepo |

---

## Endpoints

```
POST   /ingest                   { github_url }
       → { repo_id }
       → async job: clone → chunk → embed → static analysis
                  → generate Understand + Improve summaries → store
       → 2 LLM calls per ingest; add delay between ingests in eval harness

GET    /ingest/{repo_id}/status  → { status, progress }
       → poll until status = "done" | "failed"

GET    /understand?repo_id=...   → { summary }
       → fast read from SQLite (pre-generated at ingest)

GET    /improve?repo_id=...      → { findings }
       → fast read from SQLite (pre-generated at ingest)
       → Phase 3: changes to POST async job (LangGraph agent)

POST   /explore                  { repo_id, question, conversation_id? }
       → { answer, sources, conversation_id }
       → conversation_id: server-generates on first call (omit to start new session)
       → sources: [{ file, lines, snippet }]

GET    /health                   → { status: "ok" }
```

---

## Storage Design

**SQLite DB:** `backend/storage/lexrai.db`

```sql
-- repos table
CREATE TABLE repos (
    repo_id          TEXT PRIMARY KEY,   -- MD5(github_url)[:12]
    github_url       TEXT,
    status           TEXT,               -- pending | running | done | failed
    understand       TEXT,               -- JSON summary (null until ingest done)
    improve          TEXT,               -- JSON findings (null until agent done)
    ingested_at      TIMESTAMP,
    improve_status   TEXT DEFAULT 'idle',    -- idle | pending | running | done | failed
    improve_progress TEXT DEFAULT ''         -- current agent step description
);

-- conversations table managed by SQLChatMessageHistory (LangChain)
-- keyed by conversation_id (UUID, server-generated)
```

**Repo ID:** `hashlib.md5(github_url.encode()).hexdigest()[:12]`
- Deterministic — same URL always produces same ID
- Keys: SQLite row + Chroma collection name + cloned repo path

**Runtime layout (gitignored):**
```
backend/storage/
  lexrai.db
  repos/
    {repo_id}/    ← cloned repo on disk
```

**Python storage module:** `backend/app/storage/db.py`

---

## Chunking

- **Strategy:** `RecursiveCharacterTextSplitter.from_language(Language.PYTHON)`
- **Chunk size:** 1000 tokens, **overlap:** 150
- **Rationale:** typical Python function fits in one chunk; coherent-but-focused tradeoff

---

## Folder Structure

```
lexrai/                     ← monorepo root
  CLAUDE.md
  context.md
  README.md
  backend/
    app/
      main.py               ← FastAPI app + route registration
      api/
        ingest.py
        understand.py
        explore.py
        improve.py          ← thin route handlers only
      core/
        config.py
        llm.py              ← get_llm() — only LLM call site
      ingestion/
        loader.py           ← LangChain GitLoader wrapper
        chunker.py
        indexer.py          ← Chroma indexing
      retrieval/
        retriever.py
      pillars/
        understand.py       ← thick: Understand logic
        explore.py          ← thick: Explore + memory logic
        improve.py          ← thick: Improve logic (Phase 3: LangGraph agent)
      analysis/
        tools.py            ← Ruff / Bandit / Radon subprocess wrappers
      storage/
        db.py               ← SQLite interface (Python code only)
    storage/                ← runtime data (gitignored)
      lexrai.db
      repos/
    tests/                  ← mirrors app/ structure
    requirements.txt
  frontend/                 ← Next.js App Router
  eval/
    tier1_repos/            ← controlled repos with planted issues
    gold_set/               ← ~20–25 Q&A pairs with known answers
    harness.py              ← eval runner (same harness every phase)
    results/                ← metrics per phase
  docs/
```

---

## Phases

### Phase 1 — Basic RAG + Eval Foundation ✅ DONE

**Scope:** Ingestion pipeline, `/explore` (single-turn Q&A), eval harness, minimal Next.js UI.

**Eval results** (`eval/results/phase1_results.json`) — repo: `pallets/click`, 20 Q&A pairs:
| Metric | Code-aware (Jina) | Naive |
|---|---|---|
| Hit@1 | 0.55 | skipped* |
| Hit@3 | 0.90 | skipped* |
| Hit@5 | 0.90 | skipped* |
| MRR | 0.717 | skipped* |

*Naive baseline skipped: `load_repo.__wrapped__` absent — fix before final report.

**Done when ALL of these hold:**
1. ✅ `POST /ingest` works end-to-end: clone → chunk → embed → static tools → summaries → store
2. ✅ `POST /explore` returns grounded answers from Chroma
3. ✅ Eval harness ran: Hit@k, MRR recorded in `eval/results/`
4. ✅ Minimal Next.js UI live: URL input, ingest trigger, status polling, Explore Q&A box

### Phase 2 — All Three Pillars *(safe submission target)* ✅ DONE

**Scope:** All pillars, conversation memory, cross-file tracing, full Next.js UI.

**Eval results** (`eval/results/phase2_results.json`) — repo: `pallets/click`:
| Metric | Value |
|---|---|
| Hit@1 | 0.55 |
| Hit@3 / Hit@5 | 0.90 |
| MRR | 0.717 |
| Understand overall (1–5) | 3.68 |
| Understand by section | purpose 2.5 / audience 3.75 / setup 5.0 / features 2.14 / limitations 5.0 |
| Improve findings | 20 (all radon/high — cyclomatic complexity in core.py) |
| Explanation coverage | 100% |

Note: Improve shows only Radon findings for click (a well-maintained library). Ruff/Bandit findings appear on repos with real issues. Precision/recall needs Tier 1 controlled repo — deferred.

**Done when ALL of these hold:**
1. ✅ `GET /understand` returns pre-generated summary
2. ✅ `GET /improve` returns pre-generated findings
3. ✅ `POST /explore` has conversation memory (`SQLChatMessageHistory`)
4. ✅ Explore sources span multiple files (cross-file tracing via Chroma retrieval)
5. ✅ Next.js UI: all 3 tabs usable (Understand / Explore / Improve)
6. ✅ Eval harness rerun: Understand rubric + Improve summary recorded

### Phase 3 — LangGraph Agent ✅ DONE

**Scope:** Improve becomes agentic, LangSmith tracing.

**Eval results** (`eval/results/phase3_results.json`) — repo: `pallets/click`:
| Metric | Value |
|---|---|
| Hit@1 | 0.55 |
| Hit@3 / Hit@5 | 0.90 |
| MRR | 0.717 |
| Improve findings (agentic) | 20 (ruff: 11, bandit: 9) |
| Explanation coverage | 100% |
| Iterations used | 1–2 (of max 5) |

Note: Phase 3 agent runs ruff + bandit in ≤2 iterations for click. Radon not triggered (LLM decides it's not needed after ruff+bandit). Phase 2 had only radon findings (run_all was called); Phase 3 agentic run finds ruff + bandit issues too — broader coverage.

**New API contracts (Phase 3):**
- `POST /improve { repo_id }` → 202, triggers background agent
- `GET /improve/{repo_id}/status` → `{ status, progress }`
- `GET /improve?repo_id=...` → unchanged (returns findings when done)

**Done when ALL of these hold:**
1. ✅ LangGraph `StateGraph` agent replaces static Improve pipeline
2. ✅ Ruff / Bandit / Radon invoked as agent tool nodes
3. ✅ Agentic loop bounded: capped iterations (5) + 2s inter-call delay
4. ✅ LangSmith tracing active (env vars set in config.py before LangChain import)
5. ✅ Eval: single-shot vs agentic comparison recorded

---

## Evaluation

**Harness:** `eval/harness.py` — same harness every phase → produces v1→v2→v3 improvement curve for report.

**Test repos:**
- **Tier 1:** 2–3 controlled repos written with Claude Code. Deliberately planted issues (known bugs, smells, complex functions). Full ground truth for precision + recall.
- **Tier 2:** 3–4 real open-source Python repos (1k–5k lines). Pick names at Phase 1 start. Vary README quality for Understand easy-to-hard spread.

**Gold set:** ~20–25 hand-written Q&A pairs with known answer files (Explore retrieval metrics).

**Metrics:**
- Hit@k, MRR
- Naive vs code-aware chunking comparison (headline experiment)
- Manual 1–5 answer scoring
- Understand rubric: purpose / audience / install / features / limitations
- Improve: detection precision + recall + judged explanation quality

**Rate-limit note:** Eval harness runs multiple ingests → add delay between ingests (~3–5s) to stay under Groq 30 RPM.

---

## Embedding Experiment

**Goal:** Prove code-aware embeddings improve retrieval — the report's evidence.
**Method:** Run MiniLM (baseline) and Jina-code (primary) on same gold set. Compare Hit@k.
**Ship:** Jina-code only. MiniLM runs in eval harness only, never in production path.
**Caveat:** Verify jina-embeddings-v2-base-code (~300MB, requires `trust_remote_code=True`) loads at acceptable speed on user hardware during Phase 1 setup.

---

## Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Endpoint design | Separate per pillar | Different inputs/outputs; maps to eval harness |
| Generation timing | Pre-generate at ingest | One wait; everything instant after |
| Async strategy | Job ID + polling | Ingest is slow; standard pattern |
| /improve Phase 3 | API contract changes (GET → POST async) | YAGNI; Phase 3 swap is a frontend 2-min fix |
| Conversation memory | `SQLChatMessageHistory` + SQLite | LangChain-native, persistent, teaches concept |
| repo_id | `MD5(url)[:12]` | Deterministic; same URL = same ID always |
| Storage | One SQLite DB, two tables | Simple; one dependency |
| LLM order | Groq primary, Gemini fallback | Groq: 30 RPM, faster inference |
| storage/ location | `backend/storage/` (sibling of `app/`) | Runtime data outside Python package |
| conversation_id | Server-generates on first call | Cleaner API; client stores and echoes back |
| Frontend Phase 1 | Minimal Next.js | Testable UI from day one |

---

## Branch Strategy

```
main      ← stable only; tested phases land here via merge
dev       ← active daily development (all work happens here)
phase-1   ← merge dev → phase-1 → main when Phase 1 eval passes
phase-2   ← merge dev → phase-2 → main when Phase 2 eval passes
phase-3   ← merge dev → phase-3 → main when Phase 3 eval passes
```

**Commit format:** `type: short description`
Types: `feat` `fix` `chore` `test` `docs` `refactor`

Examples:
```
chore: project scaffold — structure, config, stub routes, db setup
feat: ingestion pipeline — clone, chunk, embed, store
feat: explore pillar — grounded Q&A with Chroma retrieval
test: eval harness phase 1 — Hit@k and MRR metrics
```

Rule: commit at every logical checkpoint (file done + test passes). Never commit broken code to `dev`.

---

## Deferred

- Tier 2 real repo names — pick at Phase 1 start
- LangGraph agent node/edge design — Phase 3
- Deployment — localhost is the bar; anything beyond is optional
