# CLAUDE.md — LexrAI

This file tells Claude Code **how to work with me** on this project.
For *what* the project is (full architecture, detailed stack, phases), see
`context.md`.

**Authority:** When this file and `context.md` disagree —
`CLAUDE.md` wins on *how we work*; `context.md` wins on *what we're building*.

---

## 0. Session startup ritual

At the start of every session, before touching any code:

1. Read this file (`CLAUDE.md`) fully.
2. Read `context.md` fully.
3. From `context.md`, identify the **current phase** and the **last completed
   state** — what's done, what's next.
4. Confirm with me what we're working on this session before writing anything.

Never start a session by guessing the state. Enter in a known state.

If `context.md` does not exist yet (fresh repo, first session), note that
and ask me to create it before we start any build work.

---

## 1. Project at a glance

**LexrAI** — an AI-powered codebase orientation assistant. A developer points
it at an unfamiliar repo and can **Understand** it, **Explore** it through
grounded Q&A, and **Improve** it via static-analysis-backed suggestions.

This is a **term project** (deadline: June 10) and a **portfolio piece**.
It is also a **learning project** — I am learning LangChain / LangGraph by
building it (LangGraph + LangSmith enter only in Phase 3). Treat teaching as
part of the job, not a side note.

---

## 2. Stack snapshot

Minimal anchor list so this file is self-sufficient. Full detail in `context.md`.

- **Language/runtime:** Python 3.12
- **Package manager:** pip
- **Backend:** FastAPI
- **Orchestration:** LangChain (Phase 1–2), LangGraph (Phase 3)
- **Vector store:** Chroma (local)
- **Embeddings:** sentence-transformers — local, no API key
  (jina-embeddings-v2-base-code primary; MiniLM as eval baseline)
- **LLM:** Gemini free tier (primary), Groq free tier (fallback)
- **Static analysis:** Ruff, Bandit, Radon
- **Frontend:** Next.js
- **Observability:** LangSmith (Phase 3 only)
- **Repo structure:** monorepo

---

## 3. How we work — the core loop

**Plan first, code after approval.** For every task:

1. Explain the plan — what we're about to build and why.
2. Wait for my explicit approval.
3. Only then write the code.

Never jump straight to code. The plan-then-approve gate is mandatory.

**One file at a time.** Build and explain one file per step.

**Chunk size: small.** Maximum ~150 lines of code per response. Larger files
are broken into reviewable chunks walked through in sequence.

---

## 4. Definition of Done

A task is **done** only when ALL of these hold:

1. **Fully implemented** — every part of the agreed plan is built. No stubs,
   no "finish later" placeholders.
2. **Runs** — executes with no errors.
3. **Tested** — its test is written alongside it and passes.
4. **Ruff clean** — no linter errors.
5. **context.md updated** — if the change was meaningful.
   Meaningful = new module, design decision, API/schema change, or phase
   progress. Not meaningful = bug fix, test tweak, rename.

Do not declare a task "done" until all five are true. Type hints are expected
as a style habit, but a type-checker (mypy) is not a hard gate.

---

## 5. Teaching — I am learning LangChain

I have zero prior LangChain experience. As we build:

- For each file, **explain the LangChain/LangGraph concept it uses** — what it
  is, why we use it here, how it fits the whole.
- Do this **in the chat, not as comments in the file.** Source files stay
  clean and production-like; the learning lives in our conversation.
- When a new concept first appears (LCEL, retrievers, StateGraph, etc.),
  pause and explain it properly before using it.

Goal: I can defend every architectural choice in a viva. "AI wrote it" must
never mean "I don't understand it." Never cut understanding to save tokens.

---

## 6. Testing

Write **tests alongside every file.** When we create a module, we create its
test in the same step. A file isn't done until its test exists and passes.

---

## 7. Frontend

The Next.js frontend is a thin UI layer. All LexrAI logic lives in the
backend; the frontend only sends requests, polls status, and renders results.

- The plan-then-approve gate and one-file-at-a-time rule still apply.
- **No LangChain teaching** for frontend files — there is no LangChain there.
- Testing is lighter — component/rendering sanity checks only, not the
  full test-alongside rigor the backend gets.

---

## 8. Git — commit on explicit approval only

**You may run git commands, but ONLY when I explicitly approve.**

- Never commit autonomously — always wait for my "go ahead" or "commit"
- Never push unless I explicitly say to push
- Suggest a commit message first; I confirm; then you run it
- Branching: work stays on `dev`; never touch `main` without my instruction

---

## 9. Phases — soft gate

The project has three phases (see `context.md`). Each phase must be
**evaluated** before moving on.

- **Evaluated** means: the eval harness in `/eval` runs clean and its metrics
  are recorded in `context.md`. (Harness structure is defined in `context.md`.)
- This is a **soft gate**: if I'm about to start the next phase before the
  current one is evaluated, **warn me** — say what's incomplete and why
  finishing matters — then **let me proceed if I choose to.**
- Phase 2 is the safe submission target. Flag anything that risks it.

---

## 10. When something is unclear — stop and brainstorm

If you hit an ambiguous or undecided point mid-build:

1. **Stop.** Do not guess and proceed.
2. Lay out the realistic options with their tradeoffs.
3. **Brainstorm them with me** — discuss, don't fire a blank question.
4. We select together. Then continue.

Applies to anything not already settled in `context.md`.

---

## 11. Free-tier LLM — rate-limit caution

The project runs on free-tier LLM APIs. Free tiers have request-per-minute
and per-day limits.

- **Warn me before writing any code that calls the LLM API.**
- **Warn me if a design would call the API heavily** — loops, batch calls,
  per-chunk LLM calls — *before* writing it, and suggest a lighter approach.
- Keep agentic loops (Phase 3 / LangGraph) **bounded** — capped iterations,
  small delays between calls.
- Embeddings run **locally** (sentence-transformers) — only final
  answer-generation hits the API. Keep that separation intact.
- Isolate the LLM behind one `get_llm()` function — never call a model
  provider directly anywhere else.

---

## 12. Efficient context use

Keep token use lean — without ever cutting the concept explanations (§5),
which are the point of the project. Concrete rules:

- Keep `context.md` concise and structured — no duplication, no bloat.
  It's read every session, so its size is a recurring cost.
- Don't re-read or re-dump a file already in context unless it changed.
- Reference `context.md` instead of restating what's already in it.
- Scope each session to a specific task, not "look at everything."
- Summarize long outputs (test logs, error dumps) — report the relevant
  part, don't paste hundreds of lines.
- (My habit) Use `/clear` when switching to an unrelated task to drop
  stale context.

---

## 13. Standing rules — quick reference

- Session start: read both files, find current state, confirm task.
- Plan → approve → code. Never skip the gate.
- One file at a time. ≤150 lines per response.
- Done = implemented + runs + tested + Ruff clean + context.md updated.
- Tests alongside every file (backend full rigor; frontend lighter).
- Explain the LangChain concept in chat for every file (backend only).
- Git: commit only on explicit approval. Never push without instruction.
- Soft phase gate — warn, then let me decide.
- Keep `context.md` updated after meaningful changes.
- Unclear point → stop, lay out options, brainstorm, decide together.
- Warn before API-calling or API-heavy code.
- Isolate the LLM behind one `get_llm()` function.
- Keep context lean — never at the cost of understanding.

---

## 14. About me — working style

- I communicate informally, sometimes with typos — read for intent.
- I prefer **honest, direct feedback over flattery.** If an idea is weak,
  say so and why. If I'm about to risk the deadline or the viva, say so plainly.
- I value understanding architecture before writing code.
- I work iteratively with explicit approval gates.
