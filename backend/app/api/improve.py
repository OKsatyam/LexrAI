import json

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.analysis.llm_review import run_llm_review
from app.analysis.tools import detect_languages, run_all_multilang
from app.core.config import settings
from app.ingestion.loader import load_from_path
from app.pillars.improve import generate_improve
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
    set_improve_status(repo_id, "running", "Detecting languages...")
    try:
        repo_path = settings.repos_dir / repo_id
        languages = detect_languages(repo_path)

        if "python" in languages:
            # LangGraph agent for Python (handles ruff+bandit+radon iteratively)
            set_improve_status(repo_id, "running", "Agent running...")
            findings = run_improve_agent(repo_id)
            # Supplement with LLM review for non-Python files in mixed repos
            if len(languages) > 1:
                docs = load_from_path(repo_path)
                llm = run_llm_review(docs, languages)
                findings = findings + llm
        else:
            # Non-Python: CLI tools (ESLint etc.) + LLM review
            set_improve_status(repo_id, "running", "Running analysis...")
            cli_findings = run_all_multilang(repo_path, languages)
            cli_explained = generate_improve(cli_findings)
            docs = load_from_path(repo_path)
            llm_findings = run_llm_review(docs, languages)
            findings = cli_explained + llm_findings

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
