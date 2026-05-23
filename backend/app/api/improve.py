from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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
    # TODO Phase 1: fetch pre-generated findings from DB
    raise HTTPException(status_code=501, detail="Not implemented — Phase 1")
