const STAGES = [
  { status: "pending", progress: "Agent queued..." },
  { status: "running", progress: "Agent running ruff analysis..." },
  { status: "running", progress: "Agent running bandit security scan..." },
  { status: "running", progress: "Agent running radon complexity check..." },
  { status: "running", progress: "Generating explanations..." },
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
  return Response.json({ status: "done", progress: "Analysis complete" });
}
