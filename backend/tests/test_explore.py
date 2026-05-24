from unittest.mock import MagicMock, patch

import pytest
from langchain_core.documents import Document

from app.pillars.explore import answer_question, _format_docs


DOCS = [
    Document(page_content="def auth(): pass", metadata={"source": "auth.py", "start_index": 0}),
    Document(page_content="def main(): pass", metadata={"source": "main.py", "start_index": 10}),
]


def test_format_docs():
    result = _format_docs(DOCS)
    assert "auth.py" in result
    assert "def auth():" in result


def test_answer_question_generates_conversation_id():
    with patch("app.pillars.explore.get_vectorstore") as mock_vs, \
         patch("app.pillars.explore.get_llm") as mock_llm, \
         patch("app.pillars.explore._get_history") as mock_hist:

        mock_retriever = MagicMock()
        mock_retriever.invoke.return_value = DOCS
        mock_vs.return_value.as_retriever.return_value = mock_retriever

        mock_chain = MagicMock()
        mock_chain.invoke.return_value = "auth.py handles authentication."
        mock_llm.return_value = MagicMock()

        mock_history = MagicMock()
        mock_history.messages = []
        mock_hist.return_value = mock_history

        with patch("app.pillars.explore._PROMPT") as mock_prompt:
            mock_prompt.__or__ = MagicMock(return_value=mock_chain)
            result = answer_question("abc123", "what does auth.py do?", None)

    assert "conversation_id" in result
    assert len(result["conversation_id"]) > 0


def test_answer_question_reuses_conversation_id():
    with patch("app.pillars.explore.get_vectorstore") as mock_vs, \
         patch("app.pillars.explore.get_llm") as mock_llm, \
         patch("app.pillars.explore._get_history") as mock_hist:

        mock_retriever = MagicMock()
        mock_retriever.invoke.return_value = DOCS
        mock_vs.return_value.as_retriever.return_value = mock_retriever

        mock_chain = MagicMock()
        mock_chain.invoke.return_value = "Answer."
        mock_llm.return_value = MagicMock()

        mock_history = MagicMock()
        mock_history.messages = []
        mock_hist.return_value = mock_history

        with patch("app.pillars.explore._PROMPT") as mock_prompt:
            mock_prompt.__or__ = MagicMock(return_value=mock_chain)
            result = answer_question("abc123", "follow up?", "existing-id")

    assert result["conversation_id"] == "existing-id"


def test_answer_question_returns_sources():
    with patch("app.pillars.explore.get_vectorstore") as mock_vs, \
         patch("app.pillars.explore.get_llm") as mock_llm, \
         patch("app.pillars.explore._get_history") as mock_hist:

        mock_retriever = MagicMock()
        mock_retriever.invoke.return_value = DOCS
        mock_vs.return_value.as_retriever.return_value = mock_retriever

        mock_chain = MagicMock()
        mock_chain.invoke.return_value = "Answer."
        mock_llm.return_value = MagicMock()

        mock_history = MagicMock()
        mock_history.messages = []
        mock_hist.return_value = mock_history

        with patch("app.pillars.explore._PROMPT") as mock_prompt:
            mock_prompt.__or__ = MagicMock(return_value=mock_chain)
            result = answer_question("abc123", "question?", None)

    assert len(result["sources"]) == 2
    assert result["sources"][0]["file"] == "auth.py"
