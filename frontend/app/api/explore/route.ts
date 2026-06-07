export async function POST(request: Request) {
  const body = await request.json();
  const conversationId: string =
    body.conversation_id ?? "mock-conv-" + Math.random().toString(36).slice(2, 8);

  return Response.json({
    answer: `The "${body.question}" functionality is handled in \`src/click/core.py\`. Click uses a decorator pattern — \`@click.command()\` wraps a Python function into a \`Command\` object. When invoked, \`BaseCommand.main()\` parses argv, resolves types via \`ParamType\`, and calls the underlying function with coerced values. Help text is auto-generated from the function's docstring and param metadata.`,
    sources: [
      {
        file: "src/click/core.py",
        lines: "120-145",
        snippet: "class BaseCommand:\n    def main(self, args=None, prog_name=None, ...):",
      },
      {
        file: "src/click/decorators.py",
        lines: "23-67",
        snippet: "def command(name=None, cls=None, **attrs):\n    ...",
      },
      {
        file: "src/click/types.py",
        lines: "1-30",
        snippet: "class ParamType:\n    name: str\n    def convert(self, value, param, ctx):",
      },
    ],
    conversation_id: conversationId,
  });
}
