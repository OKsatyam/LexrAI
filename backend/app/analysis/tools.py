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
            # Map ruff codes to high/medium/low for consistent UI display
            severity=(
                "high" if item.get("code", "").startswith("E9")  # syntax/runtime errors
                else "medium" if item.get("code", "").startswith(("E", "W"))
                else "low"
            ),
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


_LANG_EXTS: dict[str, str] = {
    ".py": "python", ".js": "javascript", ".jsx": "javascript",
    ".ts": "typescript", ".tsx": "typescript", ".go": "go",
    ".rs": "rust", ".java": "java", ".rb": "ruby",
    ".cpp": "cpp", ".cc": "cpp", ".c": "c", ".cs": "csharp",
    ".php": "php", ".kt": "kotlin", ".swift": "swift",
}


def detect_languages(repo_path: Path) -> list[str]:
    """Return sorted list of language names found in repo, most files first."""
    counts: dict[str, int] = {}
    for f in repo_path.rglob("*"):
        if f.is_file():
            lang = _LANG_EXTS.get(f.suffix.lower())
            if lang:
                counts[lang] = counts.get(lang, 0) + 1
    return sorted(counts, key=lambda k: -counts[k])


def run_eslint(repo_path: Path) -> list[Finding]:
    """Run ESLint on JS/TS files. Requires Node.js. Uses project config if present."""
    try:
        result = subprocess.run(
            ["npx", "--yes", "eslint", "--format", "json",
             "--ext", ".js,.jsx,.ts,.tsx", str(repo_path)],
            capture_output=True, text=True, timeout=60,
        )
        items = json.loads(result.stdout or "[]")
        findings = []
        for file_result in items:
            fp = file_result.get("filePath", "")
            for msg in file_result.get("messages", []):
                sev = msg.get("severity", 1)
                findings.append(Finding(
                    tool="eslint",
                    file=fp,
                    line=msg.get("line", 0),
                    severity="high" if sev == 2 else "low",
                    message=f"[{msg.get('ruleId', 'eslint')}] {msg.get('message', '')}",
                ))
        return findings
    except Exception:
        return []


def run_all(repo_path: Path) -> list[Finding]:
    return run_ruff(repo_path) + run_bandit(repo_path) + run_radon(repo_path)


def run_all_multilang(repo_path: Path, languages: list[str]) -> list[Finding]:
    findings: list[Finding] = []
    if "python" in languages:
        findings += run_ruff(repo_path) + run_bandit(repo_path) + run_radon(repo_path)
    if "javascript" in languages or "typescript" in languages:
        findings += run_eslint(repo_path)
    return findings
