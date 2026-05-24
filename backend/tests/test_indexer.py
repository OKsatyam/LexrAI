from unittest.mock import MagicMock, patch

import pytest
from langchain_core.documents import Document

from app.ingestion.indexer import get_vectorstore, index_documents


@pytest.fixture
def sample_chunks():
    return [
        Document(page_content="def hello(): return 'hi'", metadata={"source": "a.py"}),
        Document(page_content="def bye(): return 'bye'", metadata={"source": "b.py"}),
    ]


@pytest.fixture
def fake_embeddings():
    emb = MagicMock()
    emb.embed_documents.return_value = [[0.1] * 768, [0.2] * 768]
    emb.embed_query.return_value = [0.15] * 768
    return emb


def test_index_documents(tmp_path, monkeypatch, sample_chunks, fake_embeddings):
    from app.core import config
    monkeypatch.setattr(config.settings, "chroma_dir", tmp_path / "chroma")

    with patch("app.ingestion.indexer.get_embeddings", return_value=fake_embeddings):
        store = index_documents("abc123", sample_chunks)

    assert store is not None


def test_get_vectorstore(tmp_path, monkeypatch, fake_embeddings):
    from app.core import config
    monkeypatch.setattr(config.settings, "chroma_dir", tmp_path / "chroma")

    with patch("app.ingestion.indexer.get_embeddings", return_value=fake_embeddings):
        store = get_vectorstore("abc123")

    assert store is not None
