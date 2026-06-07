const SUMMARY = `# pallets/click — Codebase Summary

## Purpose
Click is a Python package for creating beautiful command line interfaces in a composable way with as little code as necessary.

## Target Audience
Python developers building CLI tools who want a decorator-based API with automatic help generation, type coercion, and command nesting.

## Setup
\`\`\`bash
pip install click
\`\`\`

## Key Features
- Decorator-based CLI creation via \`@click.command()\` and \`@click.option()\`
- Automatic help page generation from function signatures and docstrings
- Arbitrary nesting of commands and command groups
- Type coercion and validation for CLI arguments
- Lazy loading support for large CLI applications
- Built-in testing utilities via \`CliRunner\`

## Limitations
- No native async support — sync-only execution model
- Limited to Python 3.8+
- No built-in shell completion for all shells out of the box`;

export async function GET() {
  return Response.json({ repo_id: "abc123def456", summary: SUMMARY });
}
