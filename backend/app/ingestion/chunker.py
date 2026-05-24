from langchain_core.documents import Document
from langchain_text_splitters import Language, RecursiveCharacterTextSplitter


def chunk_documents(docs: list[Document]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter.from_language(
        language=Language.PYTHON,
        chunk_size=1000,
        chunk_overlap=150,
    )
    return splitter.split_documents(docs)


def chunk_documents_naive(docs: list[Document]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
    )
    return splitter.split_documents(docs)
