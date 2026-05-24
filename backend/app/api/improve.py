import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.storage.db import get_repo

router = APIRouter(prefix="/improve", tags=["improve"])


class Finding(BaseModel):
    tool: str
    file: str
    line: int
    severity: str
    message: str
    explanation: str


class ImproveResponse(BaseModel):
    repo_id: str
    findings: list[Finding]


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
