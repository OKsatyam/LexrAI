"use client";

import { useState } from "react";
import type { Finding } from "../lib/types";

const severityBorderColor: Record<string, string> = {
  high: "var(--red-soft)",
  error: "var(--red-soft)",
  medium: "var(--amber)",
  warning: "var(--amber)",
  low: "var(--steel)",
};

const severityLabel: Record<string, string> = {
  high: "HIGH",
  error: "HIGH",
  medium: "MED",
  warning: "LOW",
  low: "LOW",
};

export default function FindingCard({ finding, onAsk }: { finding: Finding; onAsk?: (q: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const color = severityBorderColor[finding.severity] ?? "var(--border2)";
  const label = severityLabel[finding.severity] ?? finding.severity.toUpperCase();

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${color}`,
        borderRadius: "6px",
        padding: "14px 16px",
        marginBottom: "8px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: "4px",
            }}
          >
            {finding.message}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            {finding.file}:{finding.line}
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "10px",
              fontWeight: 600,
              padding: "2px 8px",
              border: `1px solid ${color}`,
              borderRadius: "3px",
              color,
              letterSpacing: "0.08em",
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "10px",
              padding: "2px 8px",
              border: "1px solid var(--border2)",
              borderRadius: "3px",
              color: "var(--text-dim)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {finding.tool}
          </span>
        </div>
      </div>

      {/* Ask → button */}
      {onAsk && (
        <button
          onClick={() => onAsk(
            `Explain this ${finding.tool} finding in ${finding.file} at line ${finding.line}: "${finding.message}". Why is this a ${finding.severity} severity issue? Is it a real problem or a false positive? How should I fix it?`
          )}
          style={{
            background: "none", border: "none",
            cursor: "pointer", fontFamily: "var(--font-mono), monospace",
            fontSize: "11px", color: "var(--green)",
            padding: "6px 0 0", letterSpacing: "0.05em",
            display: "block",
          }}
        >
          Ask in Explore →
        </button>
      )}

      {finding.explanation && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
              color: "var(--text-muted)",
              padding: "8px 0 0",
              letterSpacing: "0.05em",
            }}
          >
            {expanded ? "▾ hide explanation" : "▸ show explanation"}
          </button>
          {expanded && (
            <p
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "12px",
                color: "var(--text-dim)",
                lineHeight: 1.6,
                marginTop: "8px",
                paddingTop: "8px",
                borderTop: "1px solid var(--border)",
              }}
            >
              {finding.explanation}
            </p>
          )}
        </>
      )}
    </div>
  );
}
