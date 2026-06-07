import hashlib
import json
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.analysis.llm_review import run_llm_review
from app.analysis.tools import detect_languages, run_all_multilang
from app.core.config import settings
from app.ingestion.chunker import chunk_documents
from app.ingestion.indexer import index_documents
from app.ingestion.loader import load_local, load_repo
from app.pillars.improve import generate_improve
from app.pillars.understand import generate_understand
from app.storage.db import create_repo, get_repo, update_repo_status, update_repo_summaries

router = APIRouter(prefix="/ingest", tags=["ingest"])

_PROGRESS = {
    "pending":    "Queued",
    "cloning":    "Cloning repository...",
    "loading":    "Reading local files...",
    "chunking":   "Splitting into chunks...",
    "indexing":   "Building vector index...",
    "analysing":  "Running static analysis...",
    "generating": "Generating summaries...",
    "done":       "Complete",
    "failed":     "Failed",
}


class IngestRequest(BaseModel):
    github_url: str


class LocalIngestRequest(BaseModel):
    path: str


class IngestResponse(BaseModel):
    repo_id: str


class StatusResponse(BaseModel):
    status: str
    progress: str


def _make_repo_id(key: str) -> str:
    return hashlib.md5(key.strip().encode()).hexdigest()[:12]


def _valid_github_url(url: str) -> bool:
    parts = url.strip().split("/")
    return url.startswith("https://github.com/") and len(parts) >= 5


def _run_shared_pipeline(repo_id: str, docs: list, analysis_path: Path) -> None:
    """Shared chunking → indexing → analysis → summarisation pipeline."""
    update_repo_status(repo_id, "chunking")
    chunks = chunk_documents(docs)

    update_repo_status(repo_id, f"indexing|{len(chunks)}")
    index_documents(repo_id, chunks)

    update_repo_status(repo_id, "analysing")
    languages = detect_languages(analysis_path)
    cli_findings = run_all_multilang(analysis_path, languages)

    update_repo_status(repo_id, "generating")
    understand = generate_understand(docs)
    # CLI findings get LLM explanations; LLM review findings already include explanations
    cli_explained = generate_improve(cli_findings)
    llm_findings = run_llm_review(docs, languages)
    improve = cli_explained + llm_findings

    update_repo_summaries(
        repo_id,
        understand=understand,
        improve=json.dumps(improve),
    )


def _run_github_pipeline(repo_id: str, github_url: str) -> None:
    try:
        update_repo_status(repo_id, "cloning")
        docs = load_repo(repo_id, github_url)
        _run_shared_pipeline(repo_id, docs, settings.repos_dir / repo_id)
    except Exception:
        update_repo_status(repo_id, "failed")
        raise


def _run_local_pipeline(repo_id: str, local_path: Path) -> None:
    try:
        update_repo_status(repo_id, "loading")
        docs = load_local(local_path)
        _run_shared_pipeline(repo_id, docs, local_path)
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
    background_tasks.add_task(_run_github_pipeline, repo_id, request.github_url)
    return IngestResponse(repo_id=repo_id)


@router.post("/local", response_model=IngestResponse)
async def ingest_local(request: LocalIngestRequest, background_tasks: BackgroundTasks):
    local_path = Path(request.path.strip()).resolve()

    if not local_path.exists():
        raise HTTPException(status_code=400, detail=f"Path does not exist: {local_path}")
    if not local_path.is_dir():
        raise HTTPException(status_code=400, detail="Path must be a directory, not a file")

    # Check at least one supported file exists
    supported = {".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs",
                 ".rb", ".cpp", ".c", ".cs", ".md", ".txt", ".yaml", ".yml",
                 ".toml", ".json", ".html", ".css", ".sh"}
    has_files = any(
        f.suffix.lower() in supported
        for f in local_path.rglob("*")
        if f.is_file()
    )
    if not has_files:
        raise HTTPException(status_code=400, detail="No supported files found in this directory")

    repo_id = _make_repo_id(str(local_path))
    create_repo(repo_id, f"local://{local_path}")
    background_tasks.add_task(_run_local_pipeline, repo_id, local_path)
    return IngestResponse(repo_id=repo_id)


@router.post("/upload", response_model=IngestResponse)
async def ingest_upload(
    files: list[UploadFile] = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Stable repo_id from sorted filenames
    key = "|".join(sorted(f.filename or "" for f in files))
    repo_id = _make_repo_id(key)

    # Write uploaded files into repos_dir/{repo_id}/
    upload_dir = settings.repos_dir / repo_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    for uf in files:
        if not uf.filename:
            continue
        # webkitdirectory sends relative paths like "myapp/src/main.py"
        dest = upload_dir / uf.filename
        dest.parent.mkdir(parents=True, exist_ok=True)
        content = await uf.read()
        dest.write_bytes(content)

    create_repo(repo_id, f"upload://{repo_id}")
    background_tasks.add_task(_run_local_pipeline, repo_id, upload_dir)
    return IngestResponse(repo_id=repo_id)


@router.get("/{repo_id}/status", response_model=StatusResponse)
async def get_status(repo_id: str):
    repo = get_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail=f"Repo {repo_id} not found")
    raw_status = repo["status"]
    # status may carry payload e.g. "indexing|342"
    if "|" in raw_status:
        key, payload = raw_status.split("|", 1)
        progress = f"Building vector index... ({payload} chunks)"
        status = key
    else:
        status = raw_status
        progress = _PROGRESS.get(raw_status, raw_status)
    return StatusResponse(status=status, progress=progress)
