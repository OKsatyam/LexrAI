"use client";

import { useState } from "react";
import IngestPanel from "./components/IngestPanel";
import UnderstandPanel from "./components/UnderstandPanel";
import ExplorePanel from "./components/ExplorePanel";
import ImprovePanel from "./components/ImprovePanel";

type Tab = "understand" | "explore" | "improve";

export default function Home() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("understand");

  const tabs: { id: Tab; label: string }[] = [
    { id: "understand", label: "Understand" },
    { id: "explore", label: "Explore" },
    { id: "improve", label: "Improve" },
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-1">LexrAI</h1>
      <p className="text-gray-400 mb-8">Understand any codebase instantly.</p>

      <IngestPanel
        onIngested={(id) => { setRepoId(id); setReady(false); }}
        onReady={() => setReady(true)}
        repoId={repoId}
      />

      {ready && repoId && (
        <div className="mt-8">
          <div className="flex gap-1 mb-4 bg-gray-900 rounded-xl p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tab === t.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "understand" && <UnderstandPanel repoId={repoId} />}
          {tab === "explore" && <ExplorePanel repoId={repoId} />}
          {tab === "improve" && <ImprovePanel repoId={repoId} />}
        </div>
      )}
    </main>
  );
}
