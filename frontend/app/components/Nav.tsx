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
    </nav>
  );
}
