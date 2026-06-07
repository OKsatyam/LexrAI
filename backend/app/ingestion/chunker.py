from collections import defaultdict
from pathlib import Path

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


def _enrich_line_numbers(chunks: list[Document]) -> None:
    """Compute start_line/end_line for each chunk by counting newlines up to start_index."""
    by_source: dict[str, list[Document]] = defaultdict(list)
    for chunk in chunks:
        src = chunk.metadata.get("source", "")
        if src:
            by_source[src].append(chunk)

    for src, src_chunks in by_source.items():
        try:
            text = Path(src).read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for chunk in src_chunks:
            si = chunk.metadata.get("start_index")
            if si is None:
                continue
            start_line = text[:si].count("\n") + 1
            end_line = start_line + chunk.page_content.count("\n")
            chunk.metadata["start_line"] = start_line
            chunk.metadata["end_line"] = end_line


_CHUNK_SIZE = 1500   # larger = fewer chunks = faster embedding, minimal retrieval quality loss
_CHUNK_OVERLAP = 200
_MAX_CHUNKS = 2000   # hard ceiling — prevents runaway embedding time on huge repos


def chunk_documents(docs: list[Document]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=_CHUNK_SIZE,
        chunk_overlap=_CHUNK_OVERLAP,
        add_start_index=True,
    )
    chunks = splitter.split_documents(docs)

    # Enforce hard cap — sample evenly across files rather than truncating
    if len(chunks) > _MAX_CHUNKS:
        step = len(chunks) / _MAX_CHUNKS
        chunks = [chunks[int(i * step)] for i in range(_MAX_CHUNKS)]

    _enrich_line_numbers(chunks)
    return chunks


def chunk_documents_naive(docs: list[Document]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
    )
    return splitter.split_documents(docs)
