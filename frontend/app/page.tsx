// frontend/app/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ingestRepo } from "./lib/api";
import { saveRepo } from "./lib/repos";
import type { StoredRepo } from "./lib/types";

const GITHUB_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/;

function parseGitHub(url: string): { owner: string; name: string } | null {
  const m = url.trim().match(GITHUB_RE);
  if (!m) return null;
  return { owner: m[1], name: m[2] };
}

export default function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const logoRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    tl.fromTo(logoRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.4 })
      .fromTo(
        headingRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5 },
        "+=0.1"
      )
      .fromTo(subRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 }, "-=0.2")
      .fromTo(formRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, "-=0.1")
      .fromTo(statsRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 }, "-=0.1");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = parseGitHub(url);
    if (!parsed) {
      setError("Enter a valid GitHub URL: https://github.com/owner/repo");
      return;
    }

    setLoading(true);
    try {
      const { repo_id } = await ingestRepo(url.trim());
      const repo: StoredRepo = {
        id: repo_id,
        repoUrl: url.trim(),
        owner: parsed.owner,
        name: parsed.name,
        status: "ingesting",
        ingestedAt: new Date().toISOString(),
        understandDone: false,
        improveFindingsCount: null,
      };
      saveRepo(repo);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start ingest. Is the backend running?");
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--black)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grid background */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.3,
        }}
      />
      {/* Green radial glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(0,255,135,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "560px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <div
          ref={logoRef}
          style={{
            fontFamily: "var(--font-display), Syne, sans-serif",
            fontWeight: 800,
            fontSize: "14px",
            color: "var(--text-dim)",
            letterSpacing: "0.15em",
            marginBottom: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span style={{ color: "var(--green)" }}>■</span>
          LEXR AI
        </div>

        {/* Heading */}
        <h1
          ref={headingRef}
          style={{
            fontFamily: "var(--font-display), Syne, sans-serif",
            fontWeight: 800,
            fontSize: "clamp(40px, 7vw, 72px)",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: "var(--text)",
            marginBottom: "20px",
          }}
        >
          Read code like a{" "}
          <span style={{ color: "var(--green)" }}>senior dev.</span>
        </h1>

        {/* Subtext */}
        <p
          ref={subRef}
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "15px",
            color: "var(--text-dim)",
            marginBottom: "40px",
            lineHeight: 1.6,
          }}
        >
          Understand any codebase in under 60 seconds.
          <br />
          Explore. Question. Improve.
        </p>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit}>
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              disabled={loading}
              style={{
                flex: 1,
                background: "var(--surface)",
                border: `1px solid ${error ? "var(--red-soft)" : "var(--border)"}`,
                borderRadius: "6px",
                padding: "12px 16px",
                fontFamily: "var(--font-mono), monospace",
                fontSize: "14px",
                color: "var(--text)",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                if (!error) e.currentTarget.style.borderColor = "var(--green)";
              }}
              onBlur={(e) => {
                if (!error) e.currentTarget.style.borderColor = "var(--border)";
              }}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              style={{
                background: "transparent",
                border: "1px solid var(--green)",
                borderRadius: "6px",
                padding: "12px 20px",
                fontFamily: "var(--font-mono), monospace",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--green)",
                cursor: loading ? "wait" : "pointer",
                whiteSpace: "nowrap",
                transition: "background 0.15s, color 0.15s",
                letterSpacing: "0.05em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--green)";
                e.currentTarget.style.color = "var(--black)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--green)";
              }}
            >
              {loading ? "INGESTING…" : "ANALYSE →"}
            </button>
          </div>

          {error && (
            <p
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "12px",
                color: "var(--red-soft)",
                textAlign: "left",
                marginTop: "4px",
              }}
            >
              {error}
            </p>
          )}
        </form>

        {/* Stats */}
        <div
          ref={statsRef}
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "32px",
            marginTop: "48px",
          }}
        >
          {["◆ 90% Hit@3", "◆ 3 pillars", "◆ <60s ingest"].map((s) => (
            <span
              key={s}
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "12px",
                color: "var(--text-muted)",
                letterSpacing: "0.05em",
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
