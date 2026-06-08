// frontend/app/components/Nav.tsx
"use client";

import Link from "next/link";

export default function Nav() {
  return (
    <nav
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--black)",
        padding: "0 24px",
        height: "52px",
        display: "flex",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <Link
        href="/dashboard"
        style={{
          fontFamily: "var(--font-display), Syne, sans-serif",
          fontWeight: 800,
          fontSize: "18px",
          color: "var(--text)",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          letterSpacing: "-0.02em",
        }}
      >
        <span style={{ color: "var(--green)", fontSize: "10px" }}>■</span>
        LEXR AI
      </Link>

      {/* Nav actions */}
      <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "11px",
            color: "var(--text-dim)",
            textDecoration: "none",
            padding: "5px 12px",
            border: "1px solid var(--border)",
            borderRadius: "5px",
            letterSpacing: "0.05em",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--green)";
            (e.currentTarget as HTMLElement).style.color = "var(--green)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-dim)";
          }}
        >
          + NEW
        </Link>
      </div>
    </nav>
  );
}
