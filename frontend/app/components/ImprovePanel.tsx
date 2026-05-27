"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:8000";

interface Finding {
  tool: string;
  file: string;
  line: number;
  severity: string;
  message: string;
  explanation: string;
}

interface Props {
  repoId: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: "text-red-400 bg-red-950",
  error: "text-red-400 bg-red-950",
  medium: "text-yellow-400 bg-yellow-950",
  warning: "text-yellow-400 bg-yellow-950",
  low: "text-blue-400 bg-blue-950",
};

export default function ImprovePanel({ repoId }: Props) {
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFindings(null);
    setError(null);
    setLoading(true);

    fetch(`${API}/improve?repo_id=${repoId}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.detail ?? "Failed to load findings.");
        } else {
          setFindings(data.findings);
        }
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [repoId]);

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">Improve</h2>

      {loading && (
        <p className="text-gray-400 text-sm animate-pulse">Loading findings…</p>
      )}

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {findings && findings.length === 0 && (
        <p className="text-gray-400 text-sm">No findings — clean codebase.</p>
      )}

      {findings && findings.length > 0 && (
        <div className="space-y-4">
          <p className="text-gray-400 text-xs">{findings.length} finding{findings.length !== 1 ? "s" : ""}</p>
          {findings.map((f, i) => {
            const colors = SEVERITY_COLORS[f.severity] ?? "text-gray-400 bg-gray-800";
            return (
              <div key={i} className="bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${colors}`}>
                    {f.severity.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono text-gray-400 uppercase">{f.tool}</span>
                  <span className="text-xs text-gray-300 font-mono truncate">
                    {f.file}:{f.line}
                  </span>
                </div>
                <p className="text-sm text-gray-200">{f.message}</p>
                {f.explanation && (
                  <p className="text-xs text-gray-400 border-l-2 border-gray-600 pl-3">
                    {f.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
