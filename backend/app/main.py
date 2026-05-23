from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import improve, ingest, understand, explore
from app.storage.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="LexrAI", version="0.1.0", lifespan=lifespan)

app.include_router(ingest.router)
app.include_router(understand.router)
app.include_router(explore.router)
app.include_router(improve.router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
