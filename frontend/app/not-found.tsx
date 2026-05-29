"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--black)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        fontFamily: "var(--font-mono), monospace",
      }}
    >
      <div
        style={{
          fontSize: "64px",
          fontFamily: "var(--font-display), Syne, sans-serif",
          fontWeight: 800,
          color: "var(--border2)",
          letterSpacing: "-0.05em",
        }}
      >
        404
      </div>
      <p style={{ fontSize: "14px", color: "var(--text-dim)" }}>
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/dashboard"
        style={{
          fontSize: "13px",
          color: "var(--green)",
          textDecoration: "none",
          border: "1px solid var(--green)",
          borderRadius: "6px",
          padding: "8px 20px",
          letterSpacing: "0.05em",
        }}
      >
        ← Dashboard
      </Link>
    </div>
  );
}
