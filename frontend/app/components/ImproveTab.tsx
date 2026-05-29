"use client";

export default function ImproveTab({ repoId }: { repoId: string }) {
  return (
    <div
      style={{
        color: "var(--text-dim)",
        fontFamily: "var(--font-mono), monospace",
      }}
    >
      Loading… {repoId}
    </div>
  );
}
