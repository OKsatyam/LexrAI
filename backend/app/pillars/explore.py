import uuid

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
        connection_string=f"sqlite:///{settings.db_path}",
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

    chain = _PROMPT | get_llm() | StrOutputParser()
    answer = chain.invoke({
        "context": _format_docs(docs),
        "question": question,
        "history": history.messages,
    })

    history.add_user_message(question)
    history.add_ai_message(answer)

    sources = [
        {
            "file": d.metadata.get("source", ""),
            "lines": str(d.metadata.get("start_index", "")),
            "snippet": d.page_content[:200],
        }
        for d in docs
    ]

    return {
        "answer": answer,
        "sources": sources,
        "conversation_id": conversation_id,
    }
