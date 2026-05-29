"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ingestRepo } from "../lib/api";
import { saveRepo } from "../lib/repos";
import type { StoredRepo } from "../lib/types";

const GITHUB_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/;

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddRepoModal({ open, onClose, onAdded }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const m = url.trim().match(GITHUB_RE);
    if (!m) {
      setError("Enter a valid GitHub URL: https://github.com/owner/repo");
      return;
    }

    setLoading(true);
    try {
      const { repo_id } = await ingestRepo(url.trim());
      const repo: StoredRepo = {
        id: repo_id,
        repoUrl: url.trim(),
        owner: m[1],
        name: m[2],
        status: "ingesting",
        ingestedAt: new Date().toISOString(),
        understandDone: false,
        improveFindingsCount: null,
      };
      saveRepo(repo);
      setUrl("");
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingest failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          color: "var(--text)",
          fontFamily: "var(--font-mono), monospace",
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "var(--font-display), Syne, sans-serif",
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            Add Repository
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            disabled={loading}
            style={{
              background: "var(--surface2)",
              border: `1px solid ${error ? "var(--red-soft)" : "var(--border)"}`,
              borderRadius: "6px",
              padding: "10px 14px",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "13px",
              color: "var(--text)",
              outline: "none",
              width: "100%",
            }}
          />

          {error && (
            <p style={{ fontSize: "12px", color: "var(--red-soft)" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !url.trim()}
            style={{
              background: loading ? "var(--border)" : "var(--green)",
              border: "none",
              borderRadius: "6px",
              padding: "10px",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--black)",
              cursor: loading ? "wait" : "pointer",
              letterSpacing: "0.05em",
            }}
          >
            {loading ? "INGESTING…" : "ANALYSE →"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
