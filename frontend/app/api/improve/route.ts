export async function POST() {
  return new Response(JSON.stringify({ repo_id: "abc123def456" }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET() {
  return Response.json({
    repo_id: "abc123def456",
    findings: [
      {
        tool: "ruff",
        severity: "warning",
        file: "src/click/core.py",
        line: 423,
        message: "E501 Line too long (92 > 88 characters)",
        explanation:
          "This line exceeds the maximum line length of 88 characters. Consider breaking it into multiple lines using parentheses or a backslash continuation for better readability.",
      },
      {
        tool: "ruff",
        severity: "warning",
        file: "src/click/decorators.py",
        line: 67,
        message: "F401 'os' imported but unused",
        explanation:
          "The 'os' module is imported at the top of the file but never used. Remove the import to keep the codebase clean and avoid confusion.",
      },
      {
        tool: "bandit",
        severity: "medium",
        file: "src/click/utils.py",
        line: 87,
        message: "B603 subprocess call — check for execution of untrusted input",
        explanation:
          "This subprocess call could be vulnerable to command injection if the input is not sanitized. Ensure all arguments are validated or use a whitelist approach before passing to subprocess.",
      },
      {
        tool: "bandit",
        severity: "low",
        file: "src/click/testing.py",
        line: 34,
        message: "B101 use of assert detected",
        explanation:
          "Assert statements are removed when Python is run with the -O flag. Use explicit raise statements for production error handling instead.",
      },
      {
        tool: "radon",
        severity: "high",
        file: "src/click/core.py",
        line: 1,
        message: "Function 'make_context' has cyclomatic complexity of 18",
        explanation:
          "A cyclomatic complexity of 18 is well above the recommended maximum of 10. This function handles too many branching paths — consider extracting argument parsing, type resolution, and error handling into separate helper functions.",
      },
    ],
  });
}
