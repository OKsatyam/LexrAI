"""LLM-based code review — works for any programming language."""
import json

from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.core.llm import get_llm

_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a senior software engineer. Review the provided code samples and identify real issues. "
        "Focus on substance: bugs, security vulnerabilities, performance problems, logic errors, anti-patterns. "
        "Do NOT flag style or formatting issues.",
    ),
    (
        "human",
        """Languages detected: {languages}

Code samples (from various files):
{samples}

Identify up to 10 real issues. Return a JSON array only — no explanation outside the array.
Each item must have exactly these fields:
{{
  "severity": "high" | "medium" | "low",
  "file": "filename only (not full path)",
  "line": <integer, best estimate or 1>,
  "message": "brief one-line description of the issue",
  "explanation": "2-3 sentences: why it is a problem and how to fix it"
}}

Return [] if no real issues found. Return ONLY the JSON array.""",
    ),
])

_MAX_CHUNKS = 20
_MAX_CHARS_PER_CHUNK = 600


def run_llm_review(docs: list[Document], languages: list[str]) -> list[dict]:
    """Single LLM call over a sample of code chunks. Returns fully-formed findings with explanations."""
    if not docs:
        return []

    samples = _build_samples(docs)
    if not samples:
        return []

    chain = _PROMPT | get_llm() | StrOutputParser()
    raw = chain.invoke({
        "languages": ", ".join(languages) if languages else "unknown",
        "samples": samples,
    })

    return _parse(raw)


def _build_samples(docs: list[Document]) -> str:
    seen: set[str] = set()
    chunks: list[str] = []

    for doc in docs:
        src = doc.metadata.get("source", "unknown")
        if src in seen:
            continue
        seen.add(src)
        snippet = doc.page_content[:_MAX_CHARS_PER_CHUNK].strip()
        from pathlib import Path
        name = Path(src).name
        chunks.append(f"### {name}\n{snippet}")
        if len(chunks) >= _MAX_CHUNKS:
            break

    return "\n\n".join(chunks)


def _parse(raw: str) -> list[dict]:
    try:
        # Strip markdown code fences if present
        text = raw.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text.strip())
        if not isinstance(data, list):
            return []
        results = []
        for item in data:
            if not isinstance(item, dict):
                continue
            results.append({
                "tool": "llm",
                "file": str(item.get("file", "unknown")),
                "line": int(item.get("line", 1)),
                "severity": str(item.get("severity", "low")).lower(),
                "message": str(item.get("message", "")),
                "explanation": str(item.get("explanation", "")),
            })
        return results
    except (json.JSONDecodeError, Exception):
        return []
