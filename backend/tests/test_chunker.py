import pytest
from langchain_core.documents import Document

from app.ingestion.chunker import chunk_documents, chunk_documents_naive

SAMPLE_CODE = '''
def add(a, b):
    """Add two numbers."""
    return a + b

def subtract(a, b):
    """Subtract b from a."""
    return a - b

class Calculator:
    def multiply(self, a, b):
        return a * b

    def divide(self, a, b):
        if b == 0:
            raise ValueError("Cannot divide by zero")
        return a / b
'''


@pytest.fixture
def sample_docs():
    return [Document(page_content=SAMPLE_CODE, metadata={"source": "calc.py"})]


def test_chunk_documents_returns_chunks(sample_docs):
    chunks = chunk_documents(sample_docs)
    assert len(chunks) >= 1
    assert all(isinstance(c, Document) for c in chunks)


def test_chunks_preserve_metadata(sample_docs):
    chunks = chunk_documents(sample_docs)
    assert all(c.metadata.get("source") == "calc.py" for c in chunks)


def test_chunk_size_respected(sample_docs):
    chunks = chunk_documents(sample_docs)
    assert all(len(c.page_content) <= 1200 for c in chunks)


def test_naive_chunker_exists(sample_docs):
    chunks = chunk_documents_naive(sample_docs)
    assert len(chunks) >= 1
