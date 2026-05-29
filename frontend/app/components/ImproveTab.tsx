"use client";

import { useCallback, useState } from "react";
import { triggerImprove, getImprovements } from "../lib/api";
import { updateRepo } from "../lib/repos";
import { useImprovePoller } from "../hooks/useImprovePoller";
import FindingCard from "./FindingCard";
import type { Finding, ImproveStatusResponse } from "../lib/types";

type State = "idle" | "running" | "done" | "failed";

export default function ImproveTab({ repoId }: { repoId: string }) {
  const [state, setState] = useState<State>("idle");
  const [pollData, setPollData] = useState<ImproveStatusResponse | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState("");

  const handleUpdate = useCallback((data: ImproveStatusResponse) => {
    setPollData(data);
    if (data.status === "failed") {
      setState("failed");
    }
  }, []);

  const handleDone = useCallback(async () => {
    try {
      const res = await getImprovements(repoId);
      setFindings(res.findings);
      updateRepo(repoId, { improveFindingsCount: res.findings.length });
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load findings");
      setState("failed");
    }
  }, [repoId]);

  useImprovePoller(repoId, state === "running", handleUpdate, handleDone);

  async function startAnalysis() {
    setError("");
    setPollData(null);
    setState("running");
    try {
      await triggerImprove(repoId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start analysis");
      setState("failed");
    }
  }

  if (state === "idle") {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "12px",
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            marginBottom: "12px",
          }}
        >
          STATIC ANALYSIS
        </div>
        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "13px",
            color: "var(--text-dim)",
            marginBottom: "24px",
            lineHeight: 1.6,
          }}
        >
          Runs Ruff (linting), Bandit (security), and Radon (complexity).
          <br />
          An AI agent orchestrates the tools and explains each finding.
        </p>
        <button
          onClick={startAnalysis}
          style={{
            background: "transparent",
            border: "1px solid var(--green)",
            borderRadius: "6px",
            padding: "10px 28px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--green)",
            cursor: "pointer",
            letterSpacing: "0.08em",
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
          RUN ANALYSIS →
        </button>
      </div>
    );
  }

  if (state === "running") {
    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "24px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "10px",
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
            marginBottom: "16px",
          }}
        >
          AGENT RUNNING
        </div>

        <div
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "13px",
            color: "var(--text-dim)",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--amber)",
              animation: "pulse 1.4s ease-in-out infinite",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          {pollData?.progress ?? "Starting analysis…"}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: "28px",
                height: "4px",
                borderRadius: "2px",
                background: "var(--surface3)",
                animation: `shimmer 1.5s ease-in-out ${i * 0.3}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--red-soft)",
          borderRadius: "8px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "13px",
            color: "var(--red-soft)",
            marginBottom: "16px",
          }}
        >
          Analysis failed: {error || pollData?.progress || "unknown error"}
        </p>
        <button
          onClick={() => { setState("idle"); setError(""); }}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "8px 20px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "12px",
            color: "var(--text-dim)",
            cursor: "pointer",
            letterSpacing: "0.05em",
          }}
        >
          RETRY
        </button>
      </div>
    );
  }

  const high = findings.filter((f) => f.severity === "high");
  const medium = findings.filter((f) => f.severity === "medium");
  const low = findings.filter((f) => f.severity === "low");
  const other = findings.filter((f) => !["high", "medium", "low"].includes(f.severity));

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "24px",
          padding: "14px 20px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          fontFamily: "var(--font-mono), monospace",
          fontSize: "13px",
          flexWrap: "wrap",
        }}
      >
        <span>
          <span style={{ color: "var(--red-soft)", fontWeight: 600 }}>{high.length}</span>
          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}> HIGH</span>
        </span>
        <span>
          <span style={{ color: "var(--amber)", fontWeight: 600 }}>{medium.length}</span>
          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}> MEDIUM</span>
        </span>
        <span>
          <span style={{ color: "var(--steel)", fontWeight: 600 }}>{low.length}</span>
          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}> LOW</span>
        </span>
        <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "11px" }}>
          {findings.length} total findings
        </span>
      </div>

      {[...high, ...medium, ...low, ...other].map((f, i) => (
        <FindingCard key={i} finding={f} />
      ))}

      {findings.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "13px",
            color: "var(--text-muted)",
          }}
        >
          No findings. Clean codebase!
        </div>
      )}
    </div>
  );
}
