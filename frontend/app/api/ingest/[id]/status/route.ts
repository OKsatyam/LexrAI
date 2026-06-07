const STAGES = [
  { status: "cloning", progress: "Cloning repository..." },
  { status: "chunking", progress: "Chunking source files..." },
  { status: "indexing", progress: "Indexing with embeddings..." },
  { status: "analysing", progress: "Running static analysis..." },
  { status: "generating", progress: "Generating summaries..." },
];

const callCounts: Record<string, number> = {};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  callCounts[id] = (callCounts[id] ?? 0) + 1;
  const n = callCounts[id];

  if (n <= STAGES.length) {
    return Response.json(STAGES[n - 1]);
  }
  return Response.json({ status: "done", progress: "Complete" });
}
