"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import Nav from "../../components/Nav";
import UnderstandTab from "../../components/UnderstandTab";
import ExploreTab from "../../components/ExploreTab";
import ImproveTab from "../../components/ImproveTab";
import { getRepoById } from "../../lib/repos";

type Tab = "understand" | "explore" | "improve";

const TABS: { id: Tab; label: string }[] = [
  { id: "understand", label: "UNDERSTAND" },
  { id: "explore", label: "EXPLORE" },
  { id: "improve", label: "IMPROVE" },
];

export default function RepoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next.js 16: params is a Promise in client components — must use React.use()
  const { id } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("understand");

  const repo = getRepoById(id);
  if (!repo) {
    notFound();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--black)" }}>
      <Nav />

      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>
        {/* Back link */}
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            background: "none",
            border: "none",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "12px",
            color: "var(--text-dim)",
            cursor: "pointer",
            marginBottom: "24px",
            padding: 0,
            letterSpacing: "0.05em",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          ← Dashboard
        </button>

        {/* Repo header */}
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontWeight: 600,
              fontSize: "20px",
              color: "var(--text)",
            }}
          >
            <span style={{ color: "var(--text-dim)" }}>{repo.owner}/</span>
            {repo.name}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "4px",
            }}
          >
            {repo.repoUrl} · Ingested {new Date(repo.ingestedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border)",
            marginBottom: "32px",
            gap: "0",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                position: "relative",
                background: "none",
                border: "none",
                padding: "10px 20px",
                fontFamily: "var(--font-mono), monospace",
                fontSize: "12px",
                fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? "var(--green)" : "var(--text-dim)",
                cursor: "pointer",
                letterSpacing: "0.1em",
                transition: "color 0.15s",
              }}
            >
              {t.label}
              {tab === t.id && (
                <motion.div
                  layoutId="tab-indicator"
                  style={{
                    position: "absolute",
                    bottom: -1,
                    left: 0,
                    right: 0,
                    height: "2px",
                    background: "var(--green)",
                    borderRadius: "1px",
                  }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "understand" && <UnderstandTab repoId={id} />}
          {tab === "explore" && <ExploreTab repoId={id} />}
          {tab === "improve" && <ImproveTab repoId={id} />}
        </motion.div>
      </main>
    </div>
  );
}
