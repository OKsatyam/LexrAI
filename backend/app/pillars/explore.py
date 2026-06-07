import os
import re
import uuid
from pathlib import Path

from langchain_community.chat_message_histories import SQLChatMessageHistory
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.core.config import settings
from app.core.llm import get_llm
from app.ingestion.indexer import get_vectorstore

_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a helpful code assistant. Answer questions about the codebase "
        "using the provided context. Reference specific files when possible.",
    ),
    MessagesPlaceholder(variable_name="history"),
    (
        "human",
        "Context from codebase:\n{context}\n\nQuestion: {question}",
    ),
])


def _get_history(conversation_id: str) -> SQLChatMessageHistory:
    return SQLChatMessageHistory(
        session_id=conversation_id,
        connection=f"sqlite:///{settings.db_path}",
    )


def _rel_path(abs_path: str, clone_root: str) -> str:
    """Strip clone root prefix, normalize to forward slashes."""
    if abs_path.startswith(clone_root):
        rel = abs_path[len(clone_root):].lstrip(os.sep)
        return rel.replace("\\", "/")
    return abs_path


def _lines_str(metadata: dict) -> str:
    start = metadata.get("start_line")
    end = metadata.get("end_line")
    if start and end:
        return f"{start}–{end}"
    return ""


_FILE_PATTERN = re.compile(
    r'\b[\w\-]+\.(?:py|ts|tsx|js|jsx|go|rs|java|rb|cpp|c|cs|md|json|yaml|yml|toml)\b'
)


def _check_missing_files(question: str, docs: list[Document]) -> str:
    """Return a warning string if the question mentions files not in the index."""
    mentioned = set(_FILE_PATTERN.findall(question.lower()))
    if not mentioned:
        return ""
    indexed = {Path(d.metadata.get("source", "")).name.lower() for d in docs}
    missing = [f for f in mentioned if f not in indexed]
    if not missing:
        return ""
    return (
        f"\n\nNote: The following file(s) mentioned in the question were NOT found "
        f"in the indexed codebase: {', '.join(missing)}. "
        f"Answer based on what is available. If the file genuinely does not exist, say so."
    )


def _format_docs(docs: list[Document]) -> str:
    return "\n\n".join(
        f"### {d.metadata.get('source', 'unknown')}\n{d.page_content}"
        for d in docs
    )


def answer_question(
    repo_id: str,
    question: str,
    conversation_id: str | None,
) -> dict:
    conversation_id = conversation_id or str(uuid.uuid4())

    vectorstore = get_vectorstore(repo_id)
    docs = vectorstore.as_retriever(search_kwargs={"k": 5}).invoke(question)

    history = _get_history(conversation_id)

    missing_note = _check_missing_files(question, docs)
    chain = _PROMPT | get_llm() | StrOutputParser()
    answer = chain.invoke({
        "context": _format_docs(docs) + missing_note,
        "question": question,
        "history": history.messages,
    })

    history.add_user_message(question)
    history.add_ai_message(answer)

    clone_root = str(settings.repos_dir / repo_id)
    sources = [
        {
            "file": _rel_path(d.metadata.get("source", ""), clone_root),
            "lines": _lines_str(d.metadata),
            "snippet": d.page_content[:200],
        }
        for d in docs
    ]

    return {
        "answer": answer,
        "sources": sources,
        "conversation_id": conversation_id,
    }
