"use client";

import { useEffect, useRef, useState } from "react";

const API = "http://localhost:8000";

interface Finding {
  tool: string;
  file: string;
  line: number;
  severity: string;
  message: string;
  explanation: string;
}

interface LogLine {
  time: string;
  tag: string;
  tagColor: string;
  msg: string;
}

interface Props {
  repoId: string;
}

const SEV_BORDER: Record<string, string> = {
  high:    "border-l-red-500",
  error:   "border-l-red-500",
  medium:  "border-l-orange-500",
  warning: "border-l-orange-500",
  low:     "border-l-blue-500",
};

const SEV_BADGE: Record<string, string> = {
  high:    "bg-red-950 text-red-400 border-red-800",
  error:   "bg-red-950 text-red-400 border-red-800",
  medium:  "bg-orange-950 text-orange-400 border-orange-800",
  warning: "bg-orange-950 text-orange-400 border-orange-800",
  low:     "bg-blue-950 text-blue-400 border-blue-800",
};

function now() {
  const d = new Date();
  return `${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

type PanelState = "idle" | "running" | "done" | "error";

export default function ImprovePanel({ repoId }: Props) {
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [log, setLog] = useState<LogLine[]>([]);
  const [iterations, setIterations] = useState(0);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const appendLog = (tag: string, tagColor: string, msg: string) =>
    setLog(prev => [...prev, { time: now(), tag, tagColor, msg }]);

  const fetchFindings = async () => {
    const res = await fetch(`${API}/improve?repo_id=${repoId}`);
    const data = await res.json();
    setFindings(data.findings ?? []);
    setPanelState("done");
  };

  const startPolling = () => {
    stopPolling();
    let lastProgress = "";
    pollRef.current = setInterval(async () => {
      const res = await fetch(`${API}/improve/${repoId}/status`);
      const data = await res.json();
      const { status, progress } = data;

      if (progress !== lastProgress) {
        lastProgress = progress;
        const tag = progress.toLowerCase().includes("ruff")   ? "[ruff]"   :
                    progress.toLowerCase().includes("bandit") ? "[bandit]" :
                    progress.toLowerCase().includes("radon")  ? "[radon]"  :
                    progress.toLowerCase().includes("explain")? "[explain]": "[decide]";
        const color = tag === "[ruff]"    ? "text-emerald-400" :
                      tag === "[bandit]"  ? "text-amber-400"   :
                      tag === "[radon]"   ? "text-red-400"     :
                      tag === "[explain]" ? "text-purple-300"  : "text-violet-400";
        appendLog(tag, color, progress);
        if (/iteration (\d)/i.test(progress)) {
          const m = progress.match(/iteration (\d)/i);
          if (m) setIterations(parseInt(m[1]));
        }
      }

      if (status === "done") {
        stopPolling();
        appendLog("[done]", "text-emerald-400", "Analysis complete.");
        await fetchFindings();
      }
      if (status === "failed") {
        stopPolling();
        setErrorMsg(progress);
        setPanelState("error");
      }
    }, 2000);
  };

  const handleRun = async () => {
    setPanelState("running");
    setLog([]);
    setIterations(0);
    setFindings([]);
    appendLog("[start]", "text-violet-400", "Sending analysis request...");
    const res = await fetch(`${API}/improve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_id: repoId }),
    });
    if (!res.ok) {
      const d = await res.json();
      setErrorMsg(d.detail ?? "Failed to start.");
      setPanelState("error");
      return;
    }
    appendLog("[decide]", "text-violet-400", "Agent starting — selecting first tool...");
    startPolling();
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  useEffect(() => () => stopPolling(), []);

  const sevCounts = findings.reduce<Record<string, number>>((acc, f) => {
    const k = ["high","error"].includes(f.severity) ? "high" :
              ["medium","warning"].includes(f.severity) ? "medium" : "low";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">Improve</h2>

      {/* IDLE */}
      {panelState === "idle" && (
        <div>
          <p className="text-gray-400 text-sm mb-4">
            Run the AI agent to detect style, security, and complexity issues.
          </p>
          <button
            onClick={handleRun}
            className="flex items-center gap-2 bg-blue-950 border border-blue-800 text-blue-400 font-mono text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <polygon points="4,2 14,8 4,14"/>
            </svg>
            Run Analysis
          </button>
        </div>
      )}

      {/* RUNNING */}
      {panelState === "running" && (
        <div>
          <div className="bg-gray-950 rounded-lg p-3 font-mono text-xs leading-loose max-h-52 overflow-y-auto mb-3">
            {log.map((l, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-gray-600 min-w-[36px]">{l.time}</span>
                <span className={`font-semibold min-w-[60px] ${l.tagColor}`}>{l.tag}</span>
                <span className="text-gray-400">{l.msg}</span>
              </div>
            ))}
            {log.length > 0 && (
              <div className="flex gap-3">
                <span className="text-gray-600 min-w-[36px]">{now()}</span>
                <span className="text-violet-400 font-semibold min-w-[60px]">[decide]</span>
                <span className="text-gray-500 animate-pulse">thinking…</span>
              </div>
            )}
            <div ref={logEndRef}/>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-gray-500">iterations</span>
            <div className="flex gap-1.5">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < iterations ? "bg-emerald-400" :
                    i === iterations ? "bg-violet-400 animate-pulse" : "bg-gray-700"
                  }`}
                />
              ))}
            </div>
            <span className="font-mono text-xs text-gray-500">{iterations} / 5</span>
          </div>
        </div>
      )}

      {/* ERROR */}
      {panelState === "error" && (
        <div>
          <p className="text-red-400 text-sm mb-3">{errorMsg}</p>
          <button
            onClick={() => setPanelState("idle")}
            className="text-xs text-gray-400 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* DONE */}
      {panelState === "done" && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <span className="font-mono text-xs text-gray-500">
              {findings.length} finding{findings.length !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-2">
              {sevCounts.high   && <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800">HIGH {sevCounts.high}</span>}
              {sevCounts.medium && <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-orange-950 text-orange-400 border border-orange-800">MED {sevCounts.medium}</span>}
              {sevCounts.low    && <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800">LOW {sevCounts.low}</span>}
            </div>
          </div>

          {findings.length === 0 && (
            <p className="text-gray-400 text-sm">No findings — clean codebase.</p>
          )}

          <div className="space-y-3">
            {findings.map((f, i) => {
              const border = SEV_BORDER[f.severity] ?? "border-l-gray-600";
              const badge  = SEV_BADGE[f.severity]  ?? "bg-gray-800 text-gray-400 border-gray-700";
              return (
                <div key={i} className={`bg-gray-800 rounded-lg p-4 border-l-2 ${border} space-y-2`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badge}`}>
                      {f.severity.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 uppercase">{f.tool}</span>
                    <span className="text-[10px] font-mono text-gray-400 truncate max-w-xs">
                      {f.file.split(/[/\\]/).pop()}:{f.line}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200">{f.message}</p>
                  {f.explanation && (
                    <p className="text-xs text-gray-500 border-l-2 border-gray-700 pl-3 leading-relaxed">
                      {f.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => { setPanelState("idle"); setLog([]); setFindings([]); }}
            className="mt-4 text-xs text-gray-500 underline"
          >
            Run again
          </button>
        </div>
      )}
    </div>
  );
}
