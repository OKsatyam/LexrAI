from collections import defaultdict
from pathlib import Path

from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.core.llm import get_llm

_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a senior software engineer. Analyze the provided files and write a precise summary.",
    ),
    (
        "human",
        """File inventory:
{inventory}

Scope: {scope}

File samples:
{samples}

Write a structured summary following the scope guidance:

SINGLE FILE (1-3 files):
- Filename and language
- What it does (purpose, responsibility)
- Every function/class: name, what it does, inputs, outputs
- Dependencies and side effects
- Potential issues or gaps

SMALL CODEBASE (4-20 files):
- Purpose of the project
- Role of each file (one line per file)
- How the files connect and depend on each other
- Entry points and data flow

FULL PROJECT (20+ files):
- Purpose and audience
- Entry points (main scripts, index files, routes)
- Key modules and what each does
- API endpoints or routes if any
- Frontend pages or components if applicable
- Languages and frameworks used
- Setup (infer from config/package files)
- Limitations or gaps

For non-code files (docs, config, env): note what they configure or document.
Be concise. Use markdown headers and bullet points.""",
    ),
])


def generate_understand(docs: list[Document]) -> str:
    chain = _PROMPT | get_llm() | StrOutputParser()
    file_count = len({d.metadata.get("source", "") for d in docs})
    if file_count <= 3:
        scope = "SINGLE FILE"
    elif file_count <= 20:
        scope = "SMALL CODEBASE"
    else:
        scope = "FULL PROJECT"
    return chain.invoke({
        "inventory": _build_inventory(docs),
        "scope": scope,
        "samples": _build_samples(docs),
    })


def _build_inventory(docs: list[Document]) -> str:
    """Build a structured file inventory grouped by language/type."""
    lang_files: dict[str, list[str]] = defaultdict(list)
    seen_sources: set[str] = set()

    for doc in docs:
        src = doc.metadata.get("source", "")
        if src in seen_sources:
            continue
        seen_sources.add(src)
        lang = doc.metadata.get("language") or doc.metadata.get("file_type", "text")
        lang_files[lang].append(Path(src).name)

    lines: list[str] = [f"Total files: {len(seen_sources)}"]
    for lang, files in sorted(lang_files.items()):
        lines.append(f"{lang} ({len(files)}): {', '.join(files[:8])}"
                     + (" …" if len(files) > 8 else ""))
    return "\n".join(lines)


def _build_samples(docs: list[Document]) -> str:
    """One sample per unique source file, capped at 15 files, 400 chars each."""
    seen: set[str] = set()
    samples: list[str] = []

    for doc in docs:
        src = doc.metadata.get("source", "")
        if src in seen:
            continue
        seen.add(src)
        name = Path(src).name
        snippet = doc.page_content[:400].strip()
        samples.append(f"### {name}\n{snippet}")
        if len(seen) >= 15:
            break

    return "\n\n".join(samples)
