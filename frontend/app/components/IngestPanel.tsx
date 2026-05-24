"use client";

import { useEffect, useRef, useState } from "react";

const API = "http://localhost:8000";

interface Props {
  repoId: string | null;
  onIngested: (id: string) => void;
  onReady: () => void;
}

export default function IngestPanel({ repoId, onIngested, onReady }: Props) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState("");
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const startPolling = (id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const res = await fetch(`${API}/ingest/${id}/status`);
      const data = await res.json();
      setStatus(data.status);
      setProgress(data.progress);
      if (data.status === "done") {
        stopPolling();
        setLoading(false);
        onReady();
      }
      if (data.status === "failed") {
        stopPolling();
        setLoading(false);
      }
    }, 2000);
  };

  const handleIngest = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setStatus("pending");
    setProgress("Sending request...");
    const res = await fetch(`${API}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ github_url: url.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setProgress(data.detail || "Error");
      setLoading(false);
      return;
    }
    onIngested(data.repo_id);
    startPolling(data.repo_id);
  };

  useEffect(() => () => stopPolling(), []);

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">Ingest a Repository</h2>
      <div className="flex gap-3">
        <input
          className="flex-1 bg-gray-800 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleIngest()}
          disabled={loading}
        />
        <button
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-5 py-2 text-sm font-medium"
          onClick={handleIngest}
          disabled={loading || !url.trim()}
        >
          {loading ? "Ingesting..." : "Ingest"}
        </button>
      </div>

      {status && (
        <div className="mt-4 text-sm">
          <span className={`font-medium ${status === "done" ? "text-green-400" : status === "failed" ? "text-red-400" : "text-yellow-400"}`}>
            {status.toUpperCase()}
          </span>
          <span className="text-gray-400 ml-2">{progress}</span>
          {repoId && <span className="text-gray-600 ml-2 text-xs">repo_id: {repoId}</span>}
        </div>
      )}
    </div>
  );
}
