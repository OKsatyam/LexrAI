// frontend/app/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ingestRepo, ingestUpload } from "./lib/api";
import { saveRepo } from "./lib/repos";

const GITHUB_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/;
type Mode = "github" | "folder" | "files";

export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("github");
  const [url, setUrl] = useState("");
  const [picked, setPicked] = useState<FileList | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const folderRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

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
    setLoading(true);
    try {
      if (mode === "github") {
        const val = url.trim();
        const m = val.match(GITHUB_RE);
        if (!m) { setError("Enter a valid GitHub URL: https://github.com/owner/repo"); setLoading(false); return; }
        const { repo_id } = await ingestRepo(val);
        saveRepo({ id: repo_id, repoUrl: val, owner: m[1], name: m[2],
          status: "ingesting", ingestedAt: new Date().toISOString(),
          understandDone: false, improveFindingsCount: null });
      } else {
        if (!picked || picked.length === 0) { setError("Pick at least one file"); setLoading(false); return; }
        const { repo_id } = await ingestUpload(picked);
        const first = picked[0].webkitRelativePath || picked[0].name;
        const name = mode === "folder"
          ? first.split("/")[0]
          : (picked.length === 1 ? picked[0].name : `${picked.length} files`);
        saveRepo({ id: repo_id, repoUrl: `upload://${repo_id}`, owner: "local", name,
          status: "ingesting", ingestedAt: new Date().toISOString(),
          understandDone: false, improveFindingsCount: null });
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed. Is the backend running?");
      setLoading(false);
    }
  }

  const canSubmit = !loading && (mode === "github" ? url.trim().length > 0 : (picked?.length ?? 0) > 0);

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

        {/* Hidden file inputs */}
        {/* @ts-expect-error webkitdirectory not in TS types */}
        <input ref={folderRef} type="file" webkitdirectory="" multiple style={{ display: "none" }}
          onChange={(e) => setPicked(e.target.files)} />
        <input ref={filesRef} type="file" multiple style={{ display: "none" }}
          onChange={(e) => setPicked(e.target.files)} />

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit}>
          {/* Mode tabs */}
          <div style={{ display: "flex", marginBottom: "10px" }}>
            {([["github", "GITHUB"], ["folder", "FOLDER"], ["files", "FILES"]] as [Mode, string][]).map(([m, label], i) => (
              <button key={m} type="button"
                onClick={() => { setMode(m); setPicked(null); setUrl(""); setError(""); }}
                style={{
                  flex: 1, padding: "7px 0",
                  background: mode === m ? "rgba(0,255,135,0.08)" : "transparent",
                  border: `1px solid ${mode === m ? "var(--green)" : "var(--border)"}`,
                  borderRadius: i === 0 ? "4px 0 0 4px" : i === 2 ? "0 4px 4px 0" : "0",
                  fontFamily: "var(--font-mono), monospace", fontSize: "11px",
                  fontWeight: mode === m ? 600 : 400,
                  color: mode === m ? "var(--green)" : "var(--text-dim)",
                  cursor: "pointer", letterSpacing: "0.08em",
                }}
              >{label}</button>
            ))}
          </div>

          {mode === "github" && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input
                type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repo" disabled={loading}
                style={{
                  flex: 1, background: "var(--surface)",
                  border: `1px solid ${error ? "var(--red-soft)" : "var(--border)"}`,
                  borderRadius: "6px", padding: "12px 16px",
                  fontFamily: "var(--font-mono), monospace", fontSize: "14px",
                  color: "var(--text)", outline: "none", transition: "border-color 0.15s",
                }}
                onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = "var(--green)"; }}
                onBlur={(e) => { if (!error) e.currentTarget.style.borderColor = "var(--border)"; }}
              />
              <button type="submit" disabled={!canSubmit} style={{
                background: "transparent", border: "1px solid var(--green)",
                borderRadius: "6px", padding: "12px 20px",
                fontFamily: "var(--font-mono), monospace", fontSize: "13px",
                fontWeight: 600, color: "var(--green)",
                cursor: canSubmit ? "pointer" : "not-allowed",
                whiteSpace: "nowrap", letterSpacing: "0.05em",
              }}>
                {loading ? "INGESTING…" : "ANALYSE →"}
              </button>
            </div>
          )}

          {(mode === "folder" || mode === "files") && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
              <button type="button"
                onClick={() => (mode === "folder" ? folderRef : filesRef).current?.click()}
                style={{
                  background: "var(--surface)",
                  border: `1px dashed ${picked ? "var(--green)" : "var(--border)"}`,
                  borderRadius: "6px", padding: "14px 16px",
                  fontFamily: "var(--font-mono), monospace", fontSize: "13px",
                  color: picked ? "var(--green)" : "var(--text-dim)",
                  cursor: "pointer", textAlign: "center",
                }}
              >
                {picked && picked.length > 0
                  ? `${mode === "folder"
                      ? (picked[0].webkitRelativePath || picked[0].name).split("/")[0] + "/"
                      : ""} ${picked.length} file${picked.length > 1 ? "s" : ""} selected`
                  : mode === "folder"
                    ? "Click to pick a folder →"
                    : "Click to pick files (1 or more) →"}
              </button>

              {picked && picked.length > 0 && (
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "left", maxHeight: "60px", overflowY: "auto" }}>
                  {Array.from(picked).slice(0, 5).map((f, i) => (
                    <div key={i}>{f.webkitRelativePath || f.name}</div>
                  ))}
                  {picked.length > 5 && <div style={{ color: "var(--text-dim)" }}>…and {picked.length - 5} more</div>}
                </div>
              )}

              <button type="submit" disabled={!canSubmit} style={{
                background: canSubmit ? "var(--green)" : "transparent",
                border: `1px solid ${canSubmit ? "var(--green)" : "var(--border)"}`,
                borderRadius: "6px", padding: "12px 20px",
                fontFamily: "var(--font-mono), monospace", fontSize: "13px",
                fontWeight: 600, color: canSubmit ? "var(--black)" : "var(--text-dim)",
                cursor: canSubmit ? "pointer" : "not-allowed", letterSpacing: "0.05em",
              }}>
                {loading ? "UPLOADING…" : "ANALYSE →"}
              </button>
            </div>
          )}

          {error && (
            <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: "12px",
              color: "var(--red-soft)", textAlign: "left", marginTop: "4px" }}>
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
        {/* Dashboard link */}
        <div style={{ marginTop: "24px" }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              background: "none", border: "none",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "12px", color: "var(--text-muted)",
              cursor: "pointer", letterSpacing: "0.05em",
              textDecoration: "underline", textUnderlineOffset: "3px",
            }}
          >
            View previous analyses →
          </button>
        </div>
      </div>
    </main>
  );
}
