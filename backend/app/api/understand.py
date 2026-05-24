from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.storage.db import get_repo

router = APIRouter(prefix="/understand", tags=["understand"])


class UnderstandResponse(BaseModel):
    repo_id: str
    summary: str


@router.get("", response_model=UnderstandResponse)
async def understand(repo_id: str):
    repo = get_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail=f"Repo {repo_id} not found")
    if repo["status"] != "done":
        raise HTTPException(
            status_code=409,
            detail=f"Repo not ready. Current status: {repo['status']}",
        )
    return UnderstandResponse(repo_id=repo_id, summary=repo["understand"])
