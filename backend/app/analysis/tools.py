import json
import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Finding:
    tool: str
    file: str
    line: int
    severity: str
    message: str


def run_ruff(repo_path: Path) -> list[Finding]:
    result = subprocess.run(
        ["ruff", "check", "--output-format=json", str(repo_path)],
        capture_output=True, text=True,
    )
    try:
        items = json.loads(result.stdout or "[]")
    except json.JSONDecodeError:
        return []

    return [
        Finding(
            tool="ruff",
            file=item.get("filename", ""),
            line=item.get("location", {}).get("row", 0),
            severity="error" if item.get("code", "").startswith("E") else "warning",
            message=f"[{item.get('code')}] {item.get('message', '')}",
        )
        for item in items
    ]


def run_bandit(repo_path: Path) -> list[Finding]:
    result = subprocess.run(
        ["bandit", "-r", "-f", "json", "-q", str(repo_path)],
        capture_output=True, text=True,
    )
    try:
        data = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return []

    return [
        Finding(
            tool="bandit",
            file=item.get("filename", ""),
            line=item.get("line_number", 0),
            severity=item.get("issue_severity", "LOW").lower(),
            message=item.get("issue_text", ""),
        )
        for item in data.get("results", [])
    ]


def run_radon(repo_path: Path) -> list[Finding]:
    result = subprocess.run(
        ["radon", "cc", "--json", "-n", "C", str(repo_path)],
        capture_output=True, text=True,
    )
    try:
        data = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return []

    findings = []
    for filepath, blocks in data.items():
        for block in blocks:
            complexity = block.get("complexity", 0)
            severity = "high" if complexity > 10 else "medium"
            findings.append(Finding(
                tool="radon",
                file=filepath,
                line=block.get("lineno", 0),
                severity=severity,
                message=f"{block.get('name')} has cyclomatic complexity {complexity} (rank {block.get('rank')})",
            ))
    return findings


def run_all(repo_path: Path) -> list[Finding]:
    return run_ruff(repo_path) + run_bandit(repo_path) + run_radon(repo_path)
