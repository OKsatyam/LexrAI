"use client";

import { useEffect, useState } from "react";
import { getUnderstanding } from "../lib/api";
import { updateRepo } from "../lib/repos";
import type { UnderstandResponse } from "../lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: "10px",
          color: "var(--text-muted)",
          letterSpacing: "0.12em",
          marginBottom: "14px",
          fontWeight: 600,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

export default function UnderstandTab({ repoId }: { repoId: string }) {
  const [data, setData] = useState<UnderstandResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getUnderstanding(repoId)
      .then((d) => {
        setData(d);
        updateRepo(repoId, { understandDone: true });
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load understanding");
      });
  }, [repoId]);

  if (error) {
    return (
      <div
        style={{
          color: "var(--red-soft)",
          fontFamily: "var(--font-mono), monospace",
          fontSize: "13px",
          padding: "20px",
        }}
      >
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "20px",
              height: "80px",
              animation: "shimmer 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <Section title="SUMMARY">
        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "13px",
            color: "var(--text)",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
          }}
        >
          {data.summary}
        </p>
      </Section>
    </div>
  );
}
