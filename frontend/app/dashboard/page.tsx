"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Nav from "../components/Nav";
import RepoCard from "../components/RepoCard";
import SkeletonCard from "../components/SkeletonCard";
import AddRepoModal from "../components/AddRepoModal";
import EmptyDashboard from "../components/EmptyDashboard";
import { getRepos } from "../lib/repos";
import type { StoredRepo } from "../lib/types";

export default function DashboardPage() {
  const [repos, setRepos] = useState<StoredRepo[] | null>(null); // null = loading
  const [modalOpen, setModalOpen] = useState(false);

  const loadRepos = useCallback(() => {
    setRepos(getRepos());
  }, []);

  useEffect(() => {
    loadRepos(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadRepos]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--black)" }}>
      <Nav />

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontFamily: "var(--font-display), Syne, sans-serif",
              fontWeight: 700,
              fontSize: "24px",
              color: "var(--text)",
              letterSpacing: "-0.02em",
            }}
          >
            Repositories
          </h1>
          <p
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "13px",
              color: "var(--text-dim)",
              marginTop: "4px",
            }}
          >
            {repos?.length ?? 0} analysed
          </p>
        </div>

        {/* Loading skeletons */}
        {repos === null && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {repos !== null && repos.length === 0 && (
          <EmptyDashboard onAdd={() => setModalOpen(true)} />
        )}

        {/* Repo grid */}
        {repos !== null && repos.length > 0 && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.05 } },
            }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {repos.map((repo) => (
              <motion.div
                key={repo.id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.25 }}
              >
                <RepoCard repo={repo} onStatusChange={loadRepos} />
              </motion.div>
            ))}

            {/* Add card */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.25 }}
            >
              <button
                onClick={() => setModalOpen(true)}
                style={{
                  width: "100%",
                  minHeight: "140px",
                  background: "transparent",
                  border: "1px dashed var(--green)",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                  color: "var(--green)",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "12px",
                  letterSpacing: "0.1em",
                  opacity: 0.7,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
              >
                <span style={{ fontSize: "28px", fontWeight: 300, lineHeight: 1 }}>+</span>
                ADD REPOSITORY
              </button>
            </motion.div>
          </motion.div>
        )}
      </main>

      <AddRepoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={loadRepos}
      />
    </div>
  );
}
