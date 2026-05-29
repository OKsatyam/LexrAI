"use client";

import Link from "next/link";

interface Props {
  onAdd: () => void;
}

export default function EmptyDashboard({ onAdd }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        textAlign: "center",
        gap: "16px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: "12px",
          color: "var(--text-muted)",
          letterSpacing: "0.1em",
        }}
      >
        NO REPOSITORIES
      </div>
      <p
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: "14px",
          color: "var(--text-dim)",
          maxWidth: "320px",
          lineHeight: 1.6,
        }}
      >
        Paste a GitHub URL to analyse your first codebase.
      </p>
      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={onAdd}
          style={{
            background: "transparent",
            border: "1px solid var(--green)",
            borderRadius: "6px",
            padding: "8px 20px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "13px",
            color: "var(--green)",
            cursor: "pointer",
            letterSpacing: "0.05em",
          }}
        >
          + ADD REPOSITORY
        </button>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 20px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "13px",
            color: "var(--text-dim)",
            textDecoration: "none",
            border: "1px solid var(--border)",
            borderRadius: "6px",
          }}
        >
          ← Landing
        </Link>
      </div>
    </div>
  );
}
