"use client";

import { useState } from "react";
import IngestPanel from "./components/IngestPanel";
import ExplorePanel from "./components/ExplorePanel";

export default function Home() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

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
          <ExplorePanel repoId={repoId} />
        </div>
      )}
    </main>
  );
}
