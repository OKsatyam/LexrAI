from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/ingest", tags=["ingest"])


class IngestRequest(BaseModel):
    github_url: str


class IngestResponse(BaseModel):
    repo_id: str


class StatusResponse(BaseModel):
    status: str
    progress: str


@router.post("", response_model=IngestResponse)
async def ingest(request: IngestRequest):
    # TODO Phase 1: validate URL, generate repo_id, trigger async pipeline
    raise HTTPException(status_code=501, detail="Not implemented — Phase 1")


@router.get("/{repo_id}/status", response_model=StatusResponse)
async def get_status(repo_id: str):
    # TODO Phase 1: fetch status from DB
    raise HTTPException(status_code=501, detail="Not implemented — Phase 1")
