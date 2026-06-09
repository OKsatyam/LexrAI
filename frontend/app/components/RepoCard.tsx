"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { StoredRepo } from "../lib/types";
import { ingestRepo } from "../lib/api";
import { updateRepo } from "../lib/repos";
import { useIngestPoller } from "../hooks/useIngestPoller";

function CircuitCorner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const rotate = { tl: 0, tr: 90, br: 180, bl: 270 }[pos];
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{
        position: "absolute",
        ...(pos === "tl" ? { top: 8, left: 8 } : {}),
        ...(pos === "tr" ? { top: 8, right: 8 } : {}),
        ...(pos === "bl" ? { bottom: 8, left: 8 } : {}),
        ...(pos === "br" ? { bottom: 8, right: 8 } : {}),
        transform: `rotate(${rotate}deg)`,
        opacity: 0.4,
        transition: "opacity 0.2s",
      }}
    >
      <path d="M0 14 L0 0 L14 0" stroke="var(--green)" strokeWidth="1.5" />
      <circle cx="0" cy="0" r="2" fill="var(--green)" />
    </svg>
  );
}

const statusColors: Record<StoredRepo["status"], string> = {
  ingesting: "var(--amber)",
  done: "var(--green)",
  failed: "var(--red-soft)",
};

const statusLabel: Record<StoredRepo["status"], string> = {
  ingesting: "INGESTING",
  done: "READY",
  failed: "FAILED",
};

interface Props {
  repo: StoredRepo;
  onStatusChange: () => void;
  onDelete: (id: string) => void;
}

export default function RepoCard({ repo, onStatusChange, onDelete }: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const handleUpdate = useCallback(() => {
    onStatusChange();
  }, [onStatusChange]);

  useIngestPoller(repo.id, repo.status === "ingesting", handleUpdate);

  const isUpload = repo.repoUrl.startsWith("upload://") || repo.repoUrl.startsWith("local://");

  async function handleRetry(e: React.MouseEvent) {
    e.stopPropagation();
    if (isUpload) return; // uploads can't be retried without re-uploading files
    setRetrying(true);
    try {
      await ingestRepo(repo.repoUrl);
      updateRepo(repo.id, { status: "ingesting" });
      onStatusChange();
    } catch {
      // leave as failed
    } finally {
      setRetrying(false);
    }
  }

  const color = statusColors[repo.status];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => repo.status === "done" && router.push(`/repos/${repo.id}`)}
      style={{
        position: "relative",
        background: "var(--surface)",
        border: `1px solid ${hovered && repo.status === "done" ? "var(--green)" : "var(--border)"}`,
        borderRadius: "8px",
        padding: "20px",
        cursor: repo.status === "done" ? "pointer" : "default",
        transition: "border-color 0.2s",
        minHeight: "140px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <CircuitCorner pos="tl" />
      <CircuitCorner pos="tr" />
      <CircuitCorner pos="bl" />
      <CircuitCorner pos="br" />

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontWeight: 600,
              fontSize: "14px",
              color: "var(--text)",
              lineHeight: 1.3,
            }}
          >
            {repo.owner}/{repo.name}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            {new Date(repo.ingestedAt).toLocaleDateString()}
          </div>
        </div>

        {/* Status chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "3px 8px",
            border: `1px solid ${color}`,
            borderRadius: "4px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "10px",
            fontWeight: 600,
            color,
            letterSpacing: "0.08em",
            flexShrink: 0,
          }}
        >
          {repo.status === "ingesting" && (
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: color,
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
          )}
          {statusLabel[repo.status]}
        </div>

        {/* Delete button — inline, visible on hover */}
        {hovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete ${repo.owner}/${repo.name}? This cannot be undone.`)) {
                onDelete(repo.id);
              }
            }}
            title="Remove"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: "12px", lineHeight: 1,
              padding: "4px 6px", marginLeft: "8px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red-soft)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            ✕
          </button>
        )}
      </div>

      {/* Feature pills */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "auto" }}>
        {repo.understandDone && <Pill label="UNDERSTOOD" />}
        {repo.improveFindingsCount !== null && (
          <Pill label={`${repo.improveFindingsCount} FINDINGS`} />
        )}
      </div>

      {/* Retry button — only on failed */}
      {repo.status === "failed" && (
        isUpload ? (
          <p style={{
            marginTop: "8px", fontSize: "10px",
            fontFamily: "var(--font-mono), monospace",
            color: "var(--text-muted)", letterSpacing: "0.05em",
          }}>
            Re-upload files to re-analyse
          </p>
        ) : (
          <button
            onClick={handleRetry}
            disabled={retrying}
            style={{
              marginTop: "8px", background: "none",
              border: "1px solid var(--red-soft)", borderRadius: "4px",
              padding: "5px 12px", fontFamily: "var(--font-mono), monospace",
              fontSize: "10px", fontWeight: 600, color: "var(--red-soft)",
              cursor: retrying ? "wait" : "pointer", letterSpacing: "0.08em",
              alignSelf: "flex-start", opacity: retrying ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {retrying ? "RETRYING…" : "↻ RETRY"}
          </button>
        )
      )}
    </motion.div>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: "10px",
        padding: "2px 8px",
        border: "1px solid var(--border2)",
        borderRadius: "3px",
        color: "var(--text-dim)",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </span>
  );
}
