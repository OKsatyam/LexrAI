"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:8000";

interface Props {
  repoId: string;
}

export default function UnderstandPanel({ repoId }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSummary(null);
    setError(null);
    setLoading(true);

    fetch(`${API}/understand?repo_id=${repoId}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.detail ?? "Failed to load summary.");
        } else {
          setSummary(data.summary);
        }
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [repoId]);

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">Understand</h2>

      {loading && (
        <p className="text-gray-400 text-sm animate-pulse">Loading summary…</p>
      )}

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {summary && (
        <pre className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed font-sans">
          {summary}
        </pre>
      )}
    </div>
  );
}
