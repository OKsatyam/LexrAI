import shutil
import subprocess
import sys
from pathlib import Path

from langchain_community.document_loaders import TextLoader
from langchain_community.document_loaders.generic import GenericLoader
from langchain_community.document_loaders.parsers import LanguageParser
from langchain_core.documents import Document

from app.core.config import settings

# Extensions handled by LangChain's LanguageParser
_LANG_EXT: dict[str, str] = {
    ".py": "python",
    ".js": "js",
    ".ts": "ts",
    ".jsx": "js",
    ".tsx": "ts",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".rb": "ruby",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".c": "c",
    ".cs": "csharp",
    ".scala": "scala",
    ".kt": "kotlin",
    ".swift": "swift",
    ".php": "php",
}

# Extensions loaded as plain text (docs, config, markup)
_TEXT_EXT: set[str] = {
    ".md", ".rst", ".txt", ".csv",
    ".yaml", ".yml", ".toml", ".ini", ".cfg",
    ".json", ".env", ".sh", ".bash", ".zsh",
    ".html", ".css", ".scss",
    ".xml", ".sql",
}

# Filenames with no extension treated as text
_TEXT_NAMES: set[str] = {"Makefile", "Dockerfile", "README", "LICENSE", "CHANGELOG"}

# Hard skip — binaries, locks, generated
_SKIP_EXT: set[str] = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
    ".woff", ".woff2", ".ttf", ".eot",
    ".pdf", ".zip", ".tar", ".gz", ".bin", ".exe", ".dll",
    ".pyc", ".pyo", ".class", ".o", ".a", ".so",
    ".lock", ".sum",
}

# Directories to always skip — generated, build artifacts, test output, caches
_SKIP_DIRS: set[str] = {
    ".git", "__pycache__", "node_modules", ".venv", "venv", "env",
    ".mypy_cache", ".pytest_cache", ".ruff_cache", ".tox",
    "dist", "build", "out", "output", "target",
    ".next", ".nuxt", ".svelte-kit", ".vercel",
    "coverage", ".coverage", "htmlcov", "lcov-report",
    ".cache", ".parcel-cache", ".turbo",
    "vendor", "third_party", "extern",
    "__generated__", "generated", "migrations",
    ".idea", ".vscode", ".vs",
}

# Test file patterns — skip test files to focus on source code
_SKIP_NAME_PATTERNS: tuple[str, ...] = (
    "test_", "_test.", ".test.", ".spec.", "_spec.",
    ".min.js", ".bundle.js", ".chunk.js",
)

# Per-ingest file cap
_MAX_FILES = 300  # reduced: better dirs filtering makes this plenty


def _rmtree(path: Path) -> None:
    """Remove a directory tree.
    On Windows, git marks pack/idx files read-only — PowerShell handles it natively."""
    if sys.platform == "win32":
        subprocess.run(
            ["powershell", "-Command",
             f"Remove-Item -Recurse -Force -Path '{path}'"],
            capture_output=True,
        )
    else:
        shutil.rmtree(path)


def _should_skip(path: Path) -> bool:
    """Return True if this file should be excluded from indexing."""
    # Skip ignored directories anywhere in path
    if any(part in _SKIP_DIRS for part in path.parts):
        return True
    ext = path.suffix.lower()
    if ext in _SKIP_EXT:
        return True
    name = path.name
    if any(pat in name for pat in _SKIP_NAME_PATTERNS):
        return True
    if ext not in _LANG_EXT and ext not in _TEXT_EXT and name not in _TEXT_NAMES:
        return True
    return False


def _collect_files(root: Path) -> list[Path]:
    """Walk root, skip ignored dirs/patterns, cap at _MAX_FILES."""
    files: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if _should_skip(path):
            continue
        files.append(path)
        if len(files) >= _MAX_FILES:
            break
    return files


def load_from_path(root: Path) -> list[Document]:
    """Load all supported files from a directory into Documents."""
    files = _collect_files(root)
    docs: list[Document] = []

    for fp in files:
        ext = fp.suffix.lower()
        lang = _LANG_EXT.get(ext)
        try:
            if lang:
                loader = GenericLoader.from_filesystem(
                    str(fp.parent),
                    glob=fp.name,
                    suffixes=[ext],
                    parser=LanguageParser(language=lang),
                )
                loaded = loader.load()
                # Tag with file_type for understand prompt
                for d in loaded:
                    d.metadata.setdefault("file_type", "code")
                    d.metadata.setdefault("language", lang)
            else:
                loaded = TextLoader(str(fp), encoding="utf-8", autodetect_encoding=True).load()
                for d in loaded:
                    d.metadata.setdefault("file_type", "text")
            docs.extend(loaded)
        except Exception:
            pass  # skip unreadable files

    return docs


def load_repo(repo_id: str, github_url: str) -> list[Document]:
    clone_path = settings.repos_dir / repo_id
    if clone_path.exists():
        _rmtree(clone_path)
    _clone_repo(github_url, clone_path)
    return load_from_path(clone_path)


def load_local(local_path: Path) -> list[Document]:
    return load_from_path(local_path)


def _clone_repo(github_url: str, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["git", "clone", "--depth=1", github_url, str(target)],
        check=True,
        capture_output=True,
    )
