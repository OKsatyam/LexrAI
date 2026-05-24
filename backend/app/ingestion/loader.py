import shutil
from pathlib import Path

from langchain_community.document_loaders.generic import GenericLoader
from langchain_community.document_loaders.parsers import LanguageParser
from langchain_core.documents import Document

from app.core.config import settings


def load_repo(repo_id: str, github_url: str) -> list[Document]:
    clone_path = settings.repos_dir / repo_id

    if clone_path.exists():
        shutil.rmtree(clone_path)

    loader = GenericLoader.from_filesystem(
        _clone_repo(github_url, clone_path),
        glob="**/*.py",
        suffixes=[".py"],
        parser=LanguageParser(language="python"),
    )
    return loader.load()


def _clone_repo(github_url: str, target: Path) -> Path:
    import subprocess
    target.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["git", "clone", "--depth=1", github_url, str(target)],
        check=True,
        capture_output=True,
    )
    return target
