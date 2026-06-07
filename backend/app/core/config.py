import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def _default_storage_dir() -> Path:
    """
    On Windows, use LOCALAPPDATA so OneDrive never syncs the clone cache.
    On other platforms, keep storage next to the backend package.
    Override with LEXRAI_STORAGE_DIR env var.
    """
    if override := os.getenv("LEXRAI_STORAGE_DIR"):
        return Path(override)
    if sys.platform == "win32":
        local = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
        return Path(local) / "LexrAI" / "storage"
    return Path(__file__).parent.parent.parent / "storage"


class Settings:
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    langsmith_api_key: str = os.getenv("LANGSMITH_API_KEY", "")
    langsmith_project: str = os.getenv("LANGSMITH_PROJECT", "lexrai")
    improve_max_iterations: int = 5

    storage_dir: Path = _default_storage_dir()
    repos_dir: Path = storage_dir / "repos"
    chroma_dir: Path = storage_dir / "chroma"
    db_path: Path = storage_dir / "lexrai.db"


settings = Settings()

# LangSmith tracing — must be set before any LangChain import resolves.
# main.py imports config first, so these are set at process startup.
if settings.langsmith_api_key:
    os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    os.environ.setdefault("LANGCHAIN_API_KEY", settings.langsmith_api_key)
    os.environ.setdefault("LANGCHAIN_PROJECT", settings.langsmith_project)

