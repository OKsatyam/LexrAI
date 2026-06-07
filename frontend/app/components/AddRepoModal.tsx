"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ingestRepo, ingestUpload } from "../lib/api";
import { saveRepo } from "../lib/repos";

const GITHUB_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/;

type Mode = "github" | "folder" | "files";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddRepoModal({ open, onClose, onAdded }: Props) {
  const [mode, setMode] = useState<Mode>("github");
  const [url, setUrl] = useState("");
  const [picked, setPicked] = useState<FileList | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const folderRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  function reset() {
    setUrl(""); setPicked(null); setError(""); setMode("github");
  }

  function handleModeChange(m: Mode) {
    setMode(m); setPicked(null); setError("");
  }

  function labelForPicked(files: FileList): string {
    const count = files.length;
    if (count === 0) return "No files selected";
    const first = files[0].webkitRelativePath || files[0].name;
    const folder = first.split("/")[0];
    if (mode === "folder") return `${folder}/ — ${count} file${count > 1 ? "s" : ""}`;
    return count === 1 ? files[0].name : `${count} files selected`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "github") {
        const val = url.trim();
        const m = val.match(GITHUB_RE);
        if (!m) { setError("Enter a valid GitHub URL: https://github.com/owner/repo"); return; }
        const { repo_id } = await ingestRepo(val);
        saveRepo({ id: repo_id, repoUrl: val, owner: m[1], name: m[2],
          status: "ingesting", ingestedAt: new Date().toISOString(),
          understandDone: false, improveFindingsCount: null });
      } else {
        if (!picked || picked.length === 0) { setError("Pick at least one file"); return; }
        const { repo_id } = await ingestUpload(picked);
        const first = picked[0].webkitRelativePath || picked[0].name;
        const name = mode === "folder"
          ? first.split("/")[0]
          : (picked.length === 1 ? picked[0].name : `${picked.length} files`);
        saveRepo({ id: repo_id, repoUrl: `upload://${repo_id}`, owner: "local", name,
          status: "ingesting", ingestedAt: new Date().toISOString(),
          understandDone: false, improveFindingsCount: null });
      }
      onAdded(); onClose(); reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !loading && (mode === "github" ? url.trim().length > 0 : (picked?.length ?? 0) > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); reset(); } }}>
      <DialogContent style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "8px", color: "var(--text)", fontFamily: "var(--font-mono), monospace",
      }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-display), Syne, sans-serif", fontWeight: 700, color: "var(--text)" }}>
            Add Repository
          </DialogTitle>
        </DialogHeader>

        {/* Mode tabs */}
        <div style={{ display: "flex", gap: "0", marginBottom: "4px" }}>
          {([["github", "GITHUB URL"], ["folder", "FOLDER"], ["files", "FILES"]] as [Mode, string][]).map(([m, label]) => (
            <button key={m} onClick={() => handleModeChange(m)} style={{
              flex: 1,
              padding: "6px 0",
              background: mode === m ? "var(--green-muted)" : "var(--surface2)",
              border: `1px solid ${mode === m ? "var(--green)" : "var(--border)"}`,
              borderRadius: m === "github" ? "4px 0 0 4px" : m === "files" ? "0 4px 4px 0" : "0",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "10px", fontWeight: mode === m ? 600 : 400,
              color: mode === m ? "var(--green)" : "var(--text-dim)",
              cursor: "pointer", letterSpacing: "0.08em",
            }}>{label}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {mode === "github" && (
            <input
              type="url" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repo" disabled={loading}
              style={{
                background: "var(--surface2)",
                border: `1px solid ${error ? "var(--red-soft)" : "var(--border)"}`,
                borderRadius: "6px", padding: "10px 14px",
                fontFamily: "var(--font-mono), monospace", fontSize: "13px",
                color: "var(--text)", outline: "none", width: "100%",
              }}
            />
          )}

          {(mode === "folder" || mode === "files") && (
            <>
              {/* Hidden file inputs */}
              <input
                ref={folderRef} type="file" style={{ display: "none" }}
                // @ts-expect-error webkitdirectory not in TS types
                webkitdirectory="" multiple
                onChange={(e) => setPicked(e.target.files)}
              />
              <input
                ref={filesRef} type="file" multiple style={{ display: "none" }}
                onChange={(e) => setPicked(e.target.files)}
              />

              {/* Pick button */}
              <button
                type="button"
                onClick={() => (mode === "folder" ? folderRef : filesRef).current?.click()}
                style={{
                  background: "var(--surface2)",
                  border: `1px dashed ${picked ? "var(--green)" : "var(--border)"}`,
                  borderRadius: "6px", padding: "14px",
                  fontFamily: "var(--font-mono), monospace", fontSize: "12px",
                  color: picked ? "var(--green)" : "var(--text-dim)",
                  cursor: "pointer", textAlign: "center", transition: "border-color 0.15s",
                }}
              >
                {picked && picked.length > 0
                  ? labelForPicked(picked)
                  : mode === "folder"
                    ? "Click to pick a folder →"
                    : "Click to pick files (1 or more) →"}
              </button>

              {/* File list preview */}
              {picked && picked.length > 0 && (
                <div style={{ maxHeight: "100px", overflowY: "auto", fontSize: "11px", color: "var(--text-muted)" }}>
                  {Array.from(picked).slice(0, 8).map((f, i) => (
                    <div key={i} style={{ padding: "1px 0" }}>
                      {f.webkitRelativePath || f.name}
                    </div>
                  ))}
                  {picked.length > 8 && (
                    <div style={{ color: "var(--text-dim)" }}>…and {picked.length - 8} more</div>
                  )}
                </div>
              )}

              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
                {mode === "folder"
                  ? "Picks the entire folder tree. Works on any language."
                  : "Select 1 or more files. Mix languages freely."}
              </p>
            </>
          )}

          {error && <p style={{ fontSize: "12px", color: "var(--red-soft)", margin: 0 }}>{error}</p>}

          <button
            type="submit" disabled={!canSubmit}
            style={{
              background: canSubmit ? "var(--green)" : "var(--border)",
              border: "none", borderRadius: "6px", padding: "10px",
              fontFamily: "var(--font-mono), monospace", fontSize: "13px",
              fontWeight: 600, color: "var(--black)",
              cursor: canSubmit ? "pointer" : "not-allowed", letterSpacing: "0.05em",
            }}
          >
            {loading ? "UPLOADING…" : "ANALYSE →"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
