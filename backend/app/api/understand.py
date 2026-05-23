from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/understand", tags=["understand"])


class UnderstandResponse(BaseModel):
    repo_id: str
    summary: str


@router.get("", response_model=UnderstandResponse)
async def understand(repo_id: str):
    # TODO Phase 1: fetch pre-generated summary from DB
    raise HTTPException(status_code=501, detail="Not implemented — Phase 1")
