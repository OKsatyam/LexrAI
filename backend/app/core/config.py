import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

class Settings:
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    langsmith_api_key: str = os.getenv("LANGSMITH_API_KEY", "")
    langsmith_project: str = os.getenv("LANGSMITH_PROJECT", "lexrai")

    # Storage paths — relative to backend/storage/
    storage_dir: Path = Path(__file__).parent.parent.parent.parent / "storage"
    repos_dir: Path = storage_dir / "repos"
    chroma_dir: Path = storage_dir / "chroma"
    db_path: Path = storage_dir / "lexrai.db"


settings = Settings()
