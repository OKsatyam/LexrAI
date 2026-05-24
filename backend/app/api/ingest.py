import hashlib
import json

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.analysis.tools import run_all
from app.core.config import settings
from app.ingestion.chunker import chunk_documents
from app.ingestion.indexer import index_documents
from app.ingestion.loader import load_repo
from app.pillars.improve import generate_improve
from app.pillars.understand import generate_understand
from app.storage.db import create_repo, get_repo, update_repo_status, update_repo_summaries

router = APIRouter(prefix="/ingest", tags=["ingest"])

_PROGRESS = {
    "pending":    "Queued",
    "cloning":    "Cloning repository...",
    "chunking":   "Splitting code into chunks...",
    "indexing":   "Building vector index...",
    "analysing":  "Running static analysis...",
    "generating": "Generating summaries...",
    "done":       "Complete",
    "failed":     "Failed",
}


class IngestRequest(BaseModel):
    github_url: str


class IngestResponse(BaseModel):
    repo_id: str


class StatusResponse(BaseModel):
    status: str
    progress: str


def _make_repo_id(github_url: str) -> str:
    return hashlib.md5(github_url.strip().encode()).hexdigest()[:12]


def _valid_github_url(url: str) -> bool:
    parts = url.strip().split("/")
    return url.startswith("https://github.com/") and len(parts) >= 5


def _run_pipeline(repo_id: str, github_url: str) -> None:
    try:
        update_repo_status(repo_id, "cloning")
        docs = load_repo(repo_id, github_url)

        update_repo_status(repo_id, "chunking")
        chunks = chunk_documents(docs)

        update_repo_status(repo_id, "indexing")
        index_documents(repo_id, chunks)

        update_repo_status(repo_id, "analysing")
        findings = run_all(settings.repos_dir / repo_id)

        update_repo_status(repo_id, "generating")
        understand = generate_understand(docs)
        improve = generate_improve(findings)

        update_repo_summaries(
            repo_id,
            understand=understand,
            improve=json.dumps(improve),
        )
    except Exception:
        update_repo_status(repo_id, "failed")
        raise


@router.post("", response_model=IngestResponse)
async def ingest(request: IngestRequest, background_tasks: BackgroundTasks):
    if not _valid_github_url(request.github_url):
        raise HTTPException(
            status_code=400,
            detail="Invalid GitHub URL. Expected: https://github.com/owner/repo",
        )
    repo_id = _make_repo_id(request.github_url)
    create_repo(repo_id, request.github_url)
    background_tasks.add_task(_run_pipeline, repo_id, request.github_url)
    return IngestResponse(repo_id=repo_id)


@router.get("/{repo_id}/status", response_model=StatusResponse)
async def get_status(repo_id: str):
    repo = get_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail=f"Repo {repo_id} not found")
    return StatusResponse(
        status=repo["status"],
        progress=_PROGRESS.get(repo["status"], repo["status"]),
    )
