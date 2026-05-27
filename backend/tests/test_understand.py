from unittest.mock import MagicMock, patch

from langchain_core.documents import Document

from app.pillars.understand import generate_understand, _build_file_list, _build_code_samples

DOCS = [
    Document(page_content="def auth(): pass", metadata={"source": "auth.py"}),
    Document(page_content="def main(): pass", metadata={"source": "main.py"}),
    Document(page_content="class DB: pass", metadata={"source": "db.py"}),
]


def test_build_file_list():
    result = _build_file_list(DOCS)
    assert "auth.py" in result
    assert "main.py" in result
    assert "db.py" in result


def test_build_code_samples_max_10_files():
    many_docs = [
        Document(page_content=f"code {i}", metadata={"source": f"file{i}.py"})
        for i in range(20)
    ]
    result = _build_code_samples(many_docs)
    assert result.count("###") <= 10


def test_generate_understand_calls_llm():
    with patch("app.pillars.understand.get_llm") as mock_get_llm:
        mock_llm = MagicMock()
        mock_get_llm.return_value = mock_llm

        with patch("app.pillars.understand._PROMPT") as mock_prompt:
            mock_chain = MagicMock()
            mock_chain.invoke.return_value = "Repo summary here"
            # Fix: make | operator on mock_chain return mock_chain so the full chain stays mockable
            mock_chain.__or__ = MagicMock(return_value=mock_chain)
            mock_prompt.__or__ = MagicMock(return_value=mock_chain)

            result = generate_understand(DOCS)

    assert isinstance(result, str)
    assert result == "Repo summary here"
