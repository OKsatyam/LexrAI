from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings

from app.core.config import settings


def get_embeddings() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(
        model_name="jinaai/jina-embeddings-v2-base-code",
        model_kwargs={"trust_remote_code": True},
    )


def index_documents(repo_id: str, chunks: list[Document]) -> Chroma:
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    return Chroma.from_documents(
        documents=chunks,
        embedding=get_embeddings(),
        collection_name=f"repo_{repo_id}",
        persist_directory=str(settings.chroma_dir),
    )


def get_vectorstore(repo_id: str) -> Chroma:
    return Chroma(
        collection_name=f"repo_{repo_id}",
        embedding_function=get_embeddings(),
        persist_directory=str(settings.chroma_dir),
    )
