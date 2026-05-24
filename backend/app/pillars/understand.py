from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.core.llm import get_llm

_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a senior software engineer. Analyze the provided codebase and write a concise repository summary.",
    ),
    (
        "human",
        """Repository files:
{file_list}

Code samples:
{code_samples}

Write a structured summary with these five sections:
1. Purpose — what this project does
2. Audience — who would use it
3. Setup — how to install/run (infer from imports and config files)
4. Key features — main capabilities
5. Limitations — what it does not do or known gaps

Be concise. Use bullet points.""",
    ),
])


def generate_understand(docs: list[Document]) -> str:
    chain = _PROMPT | get_llm() | StrOutputParser()
    return chain.invoke({
        "file_list": _build_file_list(docs),
        "code_samples": _build_code_samples(docs),
    })


def _build_file_list(docs: list[Document]) -> str:
    files = sorted({d.metadata.get("source", "") for d in docs})
    return "\n".join(files)


def _build_code_samples(docs: list[Document]) -> str:
    seen: set[str] = set()
    samples: list[str] = []
    for doc in docs:
        src = doc.metadata.get("source", "")
        if src not in seen:
            seen.add(src)
            snippet = doc.page_content[:500].strip()
            samples.append(f"### {src}\n{snippet}")
        if len(seen) >= 10:
            break
    return "\n\n".join(samples)
