import json
from dataclasses import asdict

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.analysis.tools import Finding
from app.core.llm import get_llm

_MAX_FINDINGS = 20

_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a senior software engineer doing a code review. Explain each finding clearly for a junior developer.",
    ),
    (
        "human",
        """Here are {count} static analysis findings from a Python codebase:

{findings_text}

For each finding, write a 1-2 sentence explanation of:
- why it is a problem
- how to fix it

Respond with a JSON array only. Each element must have:
  "index": the finding number (integer, starting at 1)
  "explanation": your explanation (string)

Example: [{{"index": 1, "explanation": "..."}}]""",
    ),
])


def generate_improve(findings: list[Finding]) -> list[dict]:
    if not findings:
        return []

    prioritized = _prioritize(findings)[:_MAX_FINDINGS]
    findings_text = _format_findings(prioritized)

    chain = _PROMPT | get_llm() | JsonOutputParser()
    explained = chain.invoke({
        "count": len(prioritized),
        "findings_text": findings_text,
    })

    explanation_map = {item["index"]: item["explanation"] for item in explained}

    result = []
    for i, finding in enumerate(prioritized, start=1):
        d = asdict(finding)
        d["explanation"] = explanation_map.get(i, "")
        result.append(d)
    return result


def _prioritize(findings: list[Finding]) -> list[Finding]:
    order = {"high": 0, "error": 1, "medium": 2, "warning": 3, "low": 4}
    return sorted(findings, key=lambda f: order.get(f.severity, 5))


def _format_findings(findings: list[Finding]) -> str:
    lines = []
    for i, f in enumerate(findings, start=1):
        lines.append(
            f"{i}. [{f.tool.upper()}] {f.file}:{f.line} ({f.severity}) — {f.message}"
        )
    return "\n".join(lines)
