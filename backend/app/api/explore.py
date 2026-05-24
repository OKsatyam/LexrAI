from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.pillars.explore import answer_question
from app.storage.db import get_repo

router = APIRouter(prefix="/explore", tags=["explore"])


class ExploreRequest(BaseModel):
    repo_id: str
    question: str
    conversation_id: Optional[str] = None


class Source(BaseModel):
    file: str
    lines: str
    snippet: str


class ExploreResponse(BaseModel):
    answer: str
    sources: list[Source]
    conversation_id: str


@router.post("", response_model=ExploreResponse)
async def explore(request: ExploreRequest):
    repo = get_repo(request.repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail=f"Repo {request.repo_id} not found")
    if repo["status"] != "done":
        raise HTTPException(
            status_code=409,
            detail=f"Repo not ready. Current status: {repo['status']}",
        )

    result = answer_question(
        repo_id=request.repo_id,
        question=request.question,
        conversation_id=request.conversation_id,
    )
    return ExploreResponse(**result)
