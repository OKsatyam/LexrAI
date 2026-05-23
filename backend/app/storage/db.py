import sqlite3
from datetime import datetime
from typing import Optional

from app.core.config import settings


def _connect() -> sqlite3.Connection:
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS repos (
                repo_id     TEXT PRIMARY KEY,
                github_url  TEXT NOT NULL,
                status      TEXT NOT NULL DEFAULT 'pending',
                understand  TEXT,
                improve     TEXT,
                ingested_at TEXT
            )
        """)
        conn.commit()


def create_repo(repo_id: str, github_url: str) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO repos (repo_id, github_url, status) VALUES (?, ?, 'pending')",
            (repo_id, github_url),
        )
        conn.commit()


def get_repo(repo_id: str) -> Optional[dict]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM repos WHERE repo_id = ?", (repo_id,)
        ).fetchone()
        return dict(row) if row else None


def update_repo_status(repo_id: str, status: str) -> None:
    with _connect() as conn:
        conn.execute(
            "UPDATE repos SET status = ? WHERE repo_id = ?",
            (status, repo_id),
        )
        conn.commit()


def update_repo_summaries(repo_id: str, understand: str, improve: str) -> None:
    with _connect() as conn:
        conn.execute(
            """UPDATE repos
               SET understand = ?, improve = ?, status = 'done', ingested_at = ?
               WHERE repo_id = ?""",
            (understand, improve, datetime.utcnow().isoformat(), repo_id),
        )
        conn.commit()
