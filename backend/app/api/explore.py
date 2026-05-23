from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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
    # TODO Phase 1: retrieve chunks, call LLM, return answer + sources
    # conversation_id: generate uuid if not provided, return in response
    raise HTTPException(status_code=501, detail="Not implemented — Phase 1")
