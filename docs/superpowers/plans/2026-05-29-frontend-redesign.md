# LexrAI Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single-page frontend with a multi-page terminal-noir Next.js app: landing → dashboard → repo detail (Understand / Explore / Improve tabs).

**Architecture:** All pages are client components (`'use client'`). State lives in `localStorage` — no auth, no server session. A single `app/lib/api.ts` module handles all backend calls. Framer Motion drives transitions and hovers; GSAP drives the landing hero reveal only.

**Tech Stack:** Next.js 16.2.6 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui, Framer Motion, GSAP, Google Fonts (Syne + IBM Plex Mono)

> **BREAKING CHANGE — Next.js 16:** Dynamic route `params` is a `Promise`. In client components, unwrap it with `React.use(params)`. In server components, `await params`. See Task 13.

---

## File Map

Files to **create** (new):
```
frontend/app/lib/types.ts
frontend/app/lib/api.ts
frontend/app/lib/repos.ts
frontend/app/hooks/useIngestPoller.ts
frontend/app/hooks/useImprovePoller.ts
frontend/app/components/Nav.tsx
frontend/app/components/RepoCard.tsx
frontend/app/components/SkeletonCard.tsx
frontend/app/components/AddRepoModal.tsx
frontend/app/components/EmptyDashboard.tsx
frontend/app/components/UnderstandTab.tsx
frontend/app/components/ExploreTab.tsx
frontend/app/components/ImproveTab.tsx
frontend/app/components/FindingCard.tsx
frontend/app/dashboard/page.tsx
frontend/app/repos/[id]/page.tsx
frontend/app/not-found.tsx
```

Files to **replace** (existing):
```
frontend/app/globals.css       ← full rewrite (CSS variables, fonts, scanline)
frontend/app/layout.tsx        ← full rewrite (Syne + IBM Plex Mono, metadata)
frontend/app/page.tsx          ← full rewrite (landing page)
```

Files to **delete** after Task 18:
```
frontend/app/components/IngestPanel.tsx
frontend/app/components/UnderstandPanel.tsx
frontend/app/components/ExplorePanel.tsx
frontend/app/components/ImprovePanel.tsx
```

---

## Task 1: Foundation — globals.css, layout.tsx, fonts

**Files:**
- Modify: `frontend/app/globals.css`
- Modify: `frontend/app/layout.tsx`

**Context:** Tailwind v4 uses `@import "tailwindcss"` and `@theme inline {}` in CSS — no `tailwind.config.js`. Fonts are loaded via `next/font/google`.

- [ ] **Step 1: Replace globals.css**

```css
/* frontend/app/globals.css */
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}

:root {
  /* Terminal-noir palette */
  --black:        #050709;
  --surface:      #0b0e12;
  --surface2:     #111418;
  --surface3:     #171c22;
  --border:       #1e2530;
  --border2:      #252d38;
  --green:        #00ff87;
  --green-dim:    #00cc6a;
  --green-muted:  rgba(0,255,135,0.08);
  --amber:        #f59e0b;
  --red-soft:     #f87171;
  --steel:        #4a7fa5;
  --text:         #e2e8f0;
  --text-dim:     #64748b;
  --text-muted:   #334155;

  /* shadcn overrides — maps their tokens to our palette */
  --background:   var(--black);
  --foreground:   var(--text);
  --card:         var(--surface);
  --card-foreground: var(--text);
  --popover:      var(--surface2);
  --popover-foreground: var(--text);
  --primary:      var(--green);
  --primary-foreground: var(--black);
  --secondary:    var(--surface3);
  --secondary-foreground: var(--text);
  --muted:        var(--surface2);
  --muted-foreground: var(--text-dim);
  --accent:       var(--green-muted);
  --accent-foreground: var(--green);
  --destructive:  var(--red-soft);
  --destructive-foreground: var(--black);
  --border:       var(--border);
  --input:        var(--surface2);
  --ring:         var(--green);
  --radius:       0.375rem;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: var(--black);
  color: var(--text);
  font-family: var(--font-mono), 'IBM Plex Mono', monospace;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

/* Scanline overlay — applied globally via ::before on a fixed layer */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,0,0,0.025) 2px,
    rgba(0,0,0,0.025) 4px
  );
  pointer-events: none;
  z-index: 9999;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: var(--surface); }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
```

- [ ] **Step 2: Replace layout.tsx**

```tsx
// frontend/app/layout.tsx
import type { Metadata } from "next";
import { Syne } from "next/font/google";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-display",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "LexrAI — Read code like a senior dev",
  description: "Understand any codebase in under 60 seconds. Explore, question, improve.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Start dev server and verify fonts load**

```bash
npm run dev
```

Open `http://localhost:3000`. Body text should be IBM Plex Mono (monospace). No console errors.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add app/globals.css app/layout.tsx
git commit -m "feat: terminal-noir CSS variables, Syne + IBM Plex Mono fonts, scanline overlay"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `frontend/app/lib/types.ts`

**Context:** Every other module imports from here. Define once, use everywhere.

- [ ] **Step 1: Create types.ts**

```ts
// frontend/app/lib/types.ts

export type RepoStatus = "ingesting" | "done" | "failed";

export interface StoredRepo {
  id: string;
  repoUrl: string;
  owner: string;
  name: string;
  status: RepoStatus;
  ingestedAt: string;       // ISO timestamp
  understandDone: boolean;
  improveFindingsCount: number | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: string;
}

export interface IngestResponse {
  repo_id: string;
}

export interface IngestStatusResponse {
  repo_id: string;
  status: "pending" | "running" | "done" | "failed";
  progress: number;
  error?: string;
}

export interface UnderstandResponse {
  repo_id: string;
  summary: string;
  key_concepts: string[];
  structure: Record<string, string[]>;
  language_breakdown: Record<string, number>;
}

export interface ExploreResponse {
  repo_id: string;
  answer: string;
  sources: string[];
}

export interface Finding {
  tool: "ruff" | "bandit" | "radon";
  severity: "high" | "medium" | "low";
  file: string;
  line: number;
  message: string;
  explanation: string;
}

export interface ImproveStatusResponse {
  repo_id: string;
  status: "pending" | "running" | "done" | "failed";
  progress: number;
  tools_run: string[];
  iterations: number;
}

export interface ImproveResponse {
  repo_id: string;
  findings: Finding[];
}
```

- [ ] **Step 2: Verify**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/lib/types.ts
git commit -m "feat: shared TypeScript types for all API responses and localStorage"
```

---

## Task 3: API Client

**Files:**
- Create: `frontend/app/lib/api.ts`

**Context:** Backend runs at `http://localhost:8000`. All functions throw if response is not 2xx. No auth headers needed.

- [ ] **Step 1: Create api.ts**

```ts
// frontend/app/lib/api.ts
import type {
  IngestResponse,
  IngestStatusResponse,
  UnderstandResponse,
  ExploreResponse,
  ImproveStatusResponse,
  ImproveResponse,
} from "./types";

const BASE = "http://localhost:8000";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export function ingestRepo(repoUrl: string): Promise<IngestResponse> {
  return req("/ingest", {
    method: "POST",
    body: JSON.stringify({ repo_url: repoUrl }),
  });
}

export function getIngestStatus(repoId: string): Promise<IngestStatusResponse> {
  return req(`/ingest/${repoId}/status`);
}

export function getUnderstanding(repoId: string): Promise<UnderstandResponse> {
  return req(`/understand?repo_id=${repoId}`);
}

export function explore(repoId: string, question: string): Promise<ExploreResponse> {
  return req("/explore", {
    method: "POST",
    body: JSON.stringify({ repo_id: repoId, question }),
  });
}

export function triggerImprove(repoId: string): Promise<{ repo_id: string }> {
  return req("/improve", {
    method: "POST",
    body: JSON.stringify({ repo_id: repoId }),
  });
}

export function getImproveStatus(repoId: string): Promise<ImproveStatusResponse> {
  return req(`/improve/${repoId}/status`);
}

export function getImprovements(repoId: string): Promise<ImproveResponse> {
  return req(`/improve?repo_id=${repoId}`);
}
```

- [ ] **Step 2: Verify**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/lib/api.ts
git commit -m "feat: typed API client wrapping all 7 backend endpoints"
```

---

## Task 4: localStorage Helpers

**Files:**
- Create: `frontend/app/lib/repos.ts`

**Context:** All localStorage access goes through this module. Repos stored under key `lexrai_repos`. Chat stored under `lexrai_chat_{repoId}`.

- [ ] **Step 1: Create repos.ts**

```ts
// frontend/app/lib/repos.ts
import type { StoredRepo, ChatMessage } from "./types";

const REPOS_KEY = "lexrai_repos";
const chatKey = (id: string) => `lexrai_chat_${id}`;

export function getRepos(): StoredRepo[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(REPOS_KEY) ?? "[]") as StoredRepo[];
  } catch {
    return [];
  }
}

export function saveRepo(repo: StoredRepo): void {
  const repos = getRepos().filter((r) => r.id !== repo.id);
  localStorage.setItem(REPOS_KEY, JSON.stringify([repo, ...repos]));
}

export function updateRepo(id: string, patch: Partial<StoredRepo>): void {
  const repos = getRepos().map((r) => (r.id === id ? { ...r, ...patch } : r));
  localStorage.setItem(REPOS_KEY, JSON.stringify(repos));
}

export function getRepoById(id: string): StoredRepo | null {
  return getRepos().find((r) => r.id === id) ?? null;
}

export function getChat(repoId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(chatKey(repoId)) ?? "[]") as ChatMessage[];
  } catch {
    return [];
  }
}

export function appendMessage(repoId: string, message: ChatMessage): void {
  const msgs = getChat(repoId);
  localStorage.setItem(chatKey(repoId), JSON.stringify([...msgs, message]));
}
```

- [ ] **Step 2: Verify**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/lib/repos.ts
git commit -m "feat: localStorage helpers for repo list and per-repo chat history"
```

---

## Task 5: Install shadcn/ui + Theme

**Files:**
- Modify: `frontend/package.json` (dependencies added by shadcn init)
- Modify: `frontend/app/globals.css` (shadcn may add variables — verify they don't override ours)
- Create: `frontend/components.json` (shadcn config)

**Context:** shadcn init detects Tailwind v4. Choose "New York" style. After init, verify CSS variables in `globals.css` still match our terminal-noir palette from Task 1.

- [ ] **Step 1: Run shadcn init**

```bash
cd frontend
npx shadcn@latest init
```

When prompted:
- Style → **New York**
- Base color → **Neutral** (we'll override with our palette)
- CSS variables → **Yes**

- [ ] **Step 2: Install required shadcn components**

```bash
npx shadcn@latest add button input dialog badge skeleton sonner
```

- [ ] **Step 3: Re-open globals.css and verify our palette is still intact**

shadcn may have added its own `:root` block. If it did, merge it so our CSS variables from Task 1 take precedence. The shadcn block maps to our palette — ensure these lines exist in `:root`:

```css
--primary:      var(--green);
--primary-foreground: var(--black);
--border:       var(--border);
--input:        var(--surface2);
--ring:         var(--green);
```

If shadcn overwrote them, restore the values from Task 1's globals.css Step 1.

- [ ] **Step 4: Install Framer Motion and GSAP**

```bash
npm install framer-motion gsap
```

- [ ] **Step 5: Verify TypeScript and dev server**

```bash
npx tsc --noEmit
npm run dev
```

Expected: no TypeScript errors, dev server starts, `http://localhost:3000` loads.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json components.json app/globals.css
git commit -m "feat: shadcn/ui (New York), framer-motion, gsap — all themed to terminal-noir"
```

---

## Task 6: Nav Component

**Files:**
- Create: `frontend/app/components/Nav.tsx`

**Context:** Shown on `/dashboard` and `/repos/[id]`. Not on landing. Syne font for logo, green square bullet `■`.

- [ ] **Step 1: Create Nav.tsx**

```tsx
// frontend/app/components/Nav.tsx
"use client";

import Link from "next/link";

export default function Nav() {
  return (
    <nav
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--black)",
        padding: "0 24px",
        height: "52px",
        display: "flex",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <Link
        href="/dashboard"
        style={{
          fontFamily: "var(--font-display), Syne, sans-serif",
          fontWeight: 800,
          fontSize: "18px",
          color: "var(--text)",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          letterSpacing: "-0.02em",
        }}
      >
        <span style={{ color: "var(--green)", fontSize: "10px" }}>■</span>
        LEXR AI
      </Link>
    </nav>
  );
}
```

- [ ] **Step 2: Verify**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/Nav.tsx
git commit -m "feat: Nav component — sticky top bar with logo and green accent"
```

---

## Task 7: Landing Page

**Files:**
- Modify: `frontend/app/page.tsx` (full rewrite)

**Context:** GSAP hero reveal. GitHub URL form → validates pattern → calls `api.ingestRepo` → saves to localStorage → redirects to `/dashboard`. No Nav on landing. All logic in this one file.

- [ ] **Step 1: Replace page.tsx**

```tsx
// frontend/app/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ingestRepo } from "./lib/api";
import { saveRepo } from "./lib/repos";
import type { StoredRepo } from "./lib/types";

const GITHUB_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/;

function parseGitHub(url: string): { owner: string; name: string } | null {
  const m = url.trim().match(GITHUB_RE);
  if (!m) return null;
  return { owner: m[1], name: m[2] };
}

export default function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const logoRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    tl.fromTo(logoRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.4 })
      .fromTo(
        headingRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5 },
        "+=0.1"
      )
      .fromTo(subRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 }, "-=0.2")
      .fromTo(formRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, "-=0.1")
      .fromTo(statsRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 }, "-=0.1");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = parseGitHub(url);
    if (!parsed) {
      setError("Enter a valid GitHub URL: https://github.com/owner/repo");
      return;
    }

    setLoading(true);
    try {
      const { repo_id } = await ingestRepo(url.trim());
      const repo: StoredRepo = {
        id: repo_id,
        repoUrl: url.trim(),
        owner: parsed.owner,
        name: parsed.name,
        status: "ingesting",
        ingestedAt: new Date().toISOString(),
        understandDone: false,
        improveFindingsCount: null,
      };
      saveRepo(repo);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start ingest. Is the backend running?");
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--black)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grid background */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.3,
        }}
      />
      {/* Green radial glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(0,255,135,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "560px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <div
          ref={logoRef}
          style={{
            fontFamily: "var(--font-display), Syne, sans-serif",
            fontWeight: 800,
            fontSize: "14px",
            color: "var(--text-dim)",
            letterSpacing: "0.15em",
            marginBottom: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span style={{ color: "var(--green)" }}>■</span>
          LEXR AI
        </div>

        {/* Heading */}
        <h1
          ref={headingRef}
          style={{
            fontFamily: "var(--font-display), Syne, sans-serif",
            fontWeight: 800,
            fontSize: "clamp(40px, 7vw, 72px)",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: "var(--text)",
            marginBottom: "20px",
          }}
        >
          Read code like a{" "}
          <span style={{ color: "var(--green)" }}>senior dev.</span>
        </h1>

        {/* Subtext */}
        <p
          ref={subRef}
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "15px",
            color: "var(--text-dim)",
            marginBottom: "40px",
            lineHeight: 1.6,
          }}
        >
          Understand any codebase in under 60 seconds.
          <br />
          Explore. Question. Improve.
        </p>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit}>
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              disabled={loading}
              style={{
                flex: 1,
                background: "var(--surface)",
                border: `1px solid ${error ? "var(--red-soft)" : "var(--border)"}`,
                borderRadius: "6px",
                padding: "12px 16px",
                fontFamily: "var(--font-mono), monospace",
                fontSize: "14px",
                color: "var(--text)",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                if (!error) e.currentTarget.style.borderColor = "var(--green)";
              }}
              onBlur={(e) => {
                if (!error) e.currentTarget.style.borderColor = "var(--border)";
              }}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              style={{
                background: "transparent",
                border: "1px solid var(--green)",
                borderRadius: "6px",
                padding: "12px 20px",
                fontFamily: "var(--font-mono), monospace",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--green)",
                cursor: loading ? "wait" : "pointer",
                whiteSpace: "nowrap",
                transition: "background 0.15s, color 0.15s",
                letterSpacing: "0.05em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--green)";
                e.currentTarget.style.color = "var(--black)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--green)";
              }}
            >
              {loading ? "INGESTING…" : "ANALYSE →"}
            </button>
          </div>

          {error && (
            <p
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "12px",
                color: "var(--red-soft)",
                textAlign: "left",
                marginTop: "4px",
              }}
            >
              {error}
            </p>
          )}
        </form>

        {/* Stats */}
        <div
          ref={statsRef}
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "32px",
            marginTop: "48px",
          }}
        >
          {["◆ 90% Hit@3", "◆ 3 pillars", "◆ &lt;60s ingest"].map((s) => (
            <span
              key={s}
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "12px",
                color: "var(--text-muted)",
                letterSpacing: "0.05em",
              }}
              dangerouslySetInnerHTML={{ __html: s }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run dev server and verify landing**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- GSAP animation plays on load (logo → heading → subtext → form → stats)
- Grid + glow visible in background
- Input highlights green on focus
- Button fills green on hover
- Entering an invalid URL shows red error message
- Entering `https://github.com/pallets/click` and clicking ANALYSE → redirects to `/dashboard` (404 for now, that's OK)

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: landing page — GSAP hero reveal, URL form, ingest trigger, redirect to dashboard"
```

---

## Task 8: useIngestPoller Hook

**Files:**
- Create: `frontend/app/hooks/useIngestPoller.ts`

**Context:** Used by `RepoCard` to poll `/ingest/{id}/status` every 2s when `status === "ingesting"`. Updates localStorage when done or failed.

- [ ] **Step 1: Create useIngestPoller.ts**

```ts
// frontend/app/hooks/useIngestPoller.ts
import { useEffect } from "react";
import { getIngestStatus } from "../lib/api";
import { updateRepo } from "../lib/repos";

export function useIngestPoller(
  repoId: string,
  isIngesting: boolean,
  onUpdate: () => void
) {
  useEffect(() => {
    if (!isIngesting) return;

    let stopped = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      if (stopped) return;
      try {
        const res = await getIngestStatus(repoId);
        if (res.status === "done") {
          updateRepo(repoId, { status: "done" });
          onUpdate();
          return;
        }
        if (res.status === "failed") {
          updateRepo(repoId, { status: "failed" });
          onUpdate();
          return;
        }
      } catch {
        // backend temporarily unavailable — keep polling
      }
      if (!stopped) {
        timeoutId = setTimeout(poll, 2000);
      }
    }

    poll();
    return () => {
      stopped = true;
      clearTimeout(timeoutId);
    };
  }, [repoId, isIngesting, onUpdate]);
}
```

- [ ] **Step 2: Verify**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useIngestPoller.ts
git commit -m "feat: useIngestPoller hook — polls ingest status, updates localStorage on completion"
```

---

## Task 9: RepoCard + SkeletonCard

**Files:**
- Create: `frontend/app/components/RepoCard.tsx`
- Create: `frontend/app/components/SkeletonCard.tsx`

**Context:** RepoCard shows repo info, status chip, circuit-trace corners. Uses `useIngestPoller`. SkeletonCard is the loading placeholder used while localStorage is being read on mount.

- [ ] **Step 1: Create RepoCard.tsx**

```tsx
// frontend/app/components/RepoCard.tsx
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { StoredRepo } from "../lib/types";
import { useIngestPoller } from "../hooks/useIngestPoller";

function CircuitCorner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const rotate = { tl: 0, tr: 90, br: 180, bl: 270 }[pos];
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{
        position: "absolute",
        ...(pos === "tl" ? { top: 8, left: 8 } : {}),
        ...(pos === "tr" ? { top: 8, right: 8 } : {}),
        ...(pos === "bl" ? { bottom: 8, left: 8 } : {}),
        ...(pos === "br" ? { bottom: 8, right: 8 } : {}),
        transform: `rotate(${rotate}deg)`,
        opacity: 0.4,
        transition: "opacity 0.2s",
      }}
    >
      <path d="M0 14 L0 0 L14 0" stroke="var(--green)" strokeWidth="1.5" />
      <circle cx="0" cy="0" r="2" fill="var(--green)" />
    </svg>
  );
}

const statusColors: Record<StoredRepo["status"], string> = {
  ingesting: "var(--amber)",
  done: "var(--green)",
  failed: "var(--red-soft)",
};

const statusLabel: Record<StoredRepo["status"], string> = {
  ingesting: "INGESTING",
  done: "READY",
  failed: "FAILED",
};

interface Props {
  repo: StoredRepo;
  onStatusChange: () => void;
}

export default function RepoCard({ repo, onStatusChange }: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const handleUpdate = useCallback(() => {
    onStatusChange();
  }, [onStatusChange]);

  useIngestPoller(repo.id, repo.status === "ingesting", handleUpdate);

  const color = statusColors[repo.status];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => repo.status === "done" && router.push(`/repos/${repo.id}`)}
      style={{
        position: "relative",
        background: "var(--surface)",
        border: `1px solid ${hovered && repo.status === "done" ? "var(--green)" : "var(--border)"}`,
        borderRadius: "8px",
        padding: "20px",
        cursor: repo.status === "done" ? "pointer" : "default",
        transition: "border-color 0.2s",
        minHeight: "140px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <CircuitCorner pos="tl" />
      <CircuitCorner pos="tr" />
      <CircuitCorner pos="bl" />
      <CircuitCorner pos="br" />

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontWeight: 600,
              fontSize: "14px",
              color: "var(--text)",
              lineHeight: 1.3,
            }}
          >
            {repo.owner}/{repo.name}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}
          >
            {new Date(repo.ingestedAt).toLocaleDateString()}
          </div>
        </div>

        {/* Status chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "3px 8px",
            border: `1px solid ${color}`,
            borderRadius: "4px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "10px",
            fontWeight: 600,
            color,
            letterSpacing: "0.08em",
            flexShrink: 0,
          }}
        >
          {repo.status === "ingesting" && (
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: color,
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
          )}
          {statusLabel[repo.status]}
        </div>
      </div>

      {/* Feature pills */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "auto" }}>
        {repo.understandDone && <Pill label="UNDERSTOOD" />}
        {repo.improveFindingsCount !== null && (
          <Pill label={`${repo.improveFindingsCount} FINDINGS`} />
        )}
      </div>
    </motion.div>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: "10px",
        padding: "2px 8px",
        border: "1px solid var(--border2)",
        borderRadius: "3px",
        color: "var(--text-dim)",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </span>
  );
}
```

Add the pulse keyframe to `globals.css` (append at the end):

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
```

- [ ] **Step 2: Create SkeletonCard.tsx**

```tsx
// frontend/app/components/SkeletonCard.tsx
export default function SkeletonCard() {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "20px",
        minHeight: "140px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div
        style={{
          height: "16px",
          width: "60%",
          background: "var(--surface2)",
          borderRadius: "4px",
          animation: "shimmer 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: "12px",
          width: "40%",
          background: "var(--surface2)",
          borderRadius: "4px",
          animation: "shimmer 1.5s ease-in-out infinite 0.2s",
        }}
      />
    </div>
  );
}
```

Add shimmer keyframe to `globals.css`:

```css
@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}
```

- [ ] **Step 3: Verify**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/components/RepoCard.tsx app/components/SkeletonCard.tsx app/globals.css
git commit -m "feat: RepoCard with circuit corners and ingest polling; SkeletonCard placeholder"
```

---

## Task 10: AddRepoModal + EmptyDashboard

**Files:**
- Create: `frontend/app/components/AddRepoModal.tsx`
- Create: `frontend/app/components/EmptyDashboard.tsx`

**Context:** AddRepoModal uses shadcn Dialog. Same ingest flow as landing page. EmptyDashboard shows when no repos exist.

- [ ] **Step 1: Create AddRepoModal.tsx**

```tsx
// frontend/app/components/AddRepoModal.tsx
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
```

- [ ] **Step 2: Create EmptyDashboard.tsx**

```tsx
// frontend/app/components/EmptyDashboard.tsx
"use client";

import Link from "next/link";

interface Props {
  onAdd: () => void;
}

export default function EmptyDashboard({ onAdd }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        textAlign: "center",
        gap: "16px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: "12px",
          color: "var(--text-muted)",
          letterSpacing: "0.1em",
        }}
      >
        NO REPOSITORIES
      </div>
      <p
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: "14px",
          color: "var(--text-dim)",
          maxWidth: "320px",
          lineHeight: 1.6,
        }}
      >
        Paste a GitHub URL to analyse your first codebase.
      </p>
      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={onAdd}
          style={{
            background: "transparent",
            border: "1px solid var(--green)",
            borderRadius: "6px",
            padding: "8px 20px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "13px",
            color: "var(--green)",
            cursor: "pointer",
            letterSpacing: "0.05em",
          }}
        >
          + ADD REPOSITORY
        </button>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 20px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "13px",
            color: "var(--text-dim)",
            textDecoration: "none",
            border: "1px solid var(--border)",
            borderRadius: "6px",
          }}
        >
          ← Landing
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/components/AddRepoModal.tsx app/components/EmptyDashboard.tsx
git commit -m "feat: AddRepoModal (shadcn Dialog) and EmptyDashboard zero-state"
```

---

## Task 11: Dashboard Page

**Files:**
- Create: `frontend/app/dashboard/page.tsx`

**Context:** Reads repos from localStorage on mount. Shows grid of RepoCards or EmptyDashboard. Includes AddRepoModal and the AddRepoCard button. Framer Motion stagger for card entrance.

- [ ] **Step 1: Create app/dashboard/ directory and page.tsx**

```tsx
// frontend/app/dashboard/page.tsx
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
    loadRepos();
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run dev server and verify dashboard**

```bash
npm run dev
```

1. Go to `http://localhost:3000` → submit a real GitHub URL (e.g. `https://github.com/pallets/click`)
2. Should redirect to `/dashboard`
3. Should see a INGESTING card for `pallets/click`
4. Card should poll and update to READY when backend finishes

Also test: open a fresh tab, go to `/dashboard` directly with no repos → should see EmptyDashboard with "ADD REPOSITORY" button.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: dashboard page — repo grid, stagger animation, empty state, add modal"
```

---

## Task 12: Repo Detail Page Shell + Tabs

**Files:**
- Create: `frontend/app/repos/[id]/page.tsx`

**Context:** BREAKING — Next.js 16 `params` is a `Promise`. Client component must use `React.use(params)` to unwrap. Tab switching uses Framer Motion `layoutId` for the sliding underline.

- [ ] **Step 1: Create directory and page.tsx**

```tsx
// frontend/app/repos/[id]/page.tsx
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
  // Next.js 16: params is a Promise in client components
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors. (UnderstandTab, ExploreTab, ImproveTab don't exist yet — create empty stubs if tsc complains)

If tsc fails on missing components, create empty stubs temporarily:

```tsx
// frontend/app/components/UnderstandTab.tsx
"use client";
export default function UnderstandTab({ repoId }: { repoId: string }) {
  return <div style={{ color: "var(--text-dim)" }}>Understand — {repoId}</div>;
}
```

Create same stub for `ExploreTab.tsx` and `ImproveTab.tsx`.

- [ ] **Step 3: Run dev server and verify tabs**

```bash
npm run dev
```

1. Go to `/dashboard`, click a READY repo card
2. Should navigate to `/repos/{id}`
3. Repo name shows in header
4. Tab switching works — green underline slides between tabs (Framer Motion)
5. Back link returns to dashboard

- [ ] **Step 4: Commit**

```bash
git add "app/repos/[id]/page.tsx" app/components/UnderstandTab.tsx app/components/ExploreTab.tsx app/components/ImproveTab.tsx
git commit -m "feat: repo detail page with animated tab indicator; React.use(params) for Next.js 16 client params"
```

---

## Task 13: UnderstandTab

**Files:**
- Modify: `frontend/app/components/UnderstandTab.tsx` (replace stub)

**Context:** Calls `api.getUnderstanding`. Shows skeleton while loading. Renders summary, key concepts, language breakdown (CSS bar), file structure tree.

- [ ] **Step 1: Replace UnderstandTab.tsx with full implementation**

```tsx
// frontend/app/components/UnderstandTab.tsx
"use client";

import { useEffect, useState } from "react";
import { getUnderstanding } from "../lib/api";
import { updateRepo } from "../lib/repos";
import type { UnderstandResponse } from "../lib/types";

function BarChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {entries.map(([lang, pct]) => (
        <div key={lang} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
              color: "var(--text-dim)",
              width: "80px",
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            {lang}
          </span>
          <div
            style={{
              flex: 1,
              height: "6px",
              background: "var(--surface2)",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: "var(--green)",
                borderRadius: "3px",
                opacity: 0.7,
                transition: "width 0.6s ease",
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
              color: "var(--text-dim)",
              width: "36px",
              flexShrink: 0,
            }}
          >
            {pct.toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function FileTree({ structure }: { structure: Record<string, string[]> }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(Object.keys(structure).slice(0, 3)));

  return (
    <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: "12px" }}>
      {Object.entries(structure).map(([dir, files]) => (
        <div key={dir} style={{ marginBottom: "4px" }}>
          <button
            onClick={() =>
              setExpanded((prev) => {
                const next = new Set(prev);
                next.has(dir) ? next.delete(dir) : next.add(dir);
                return next;
              })
            }
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-dim)",
              fontFamily: "inherit",
              fontSize: "inherit",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "2px 0",
            }}
          >
            <span style={{ color: "var(--green)", opacity: 0.6 }}>
              {expanded.has(dir) ? "▾" : "▸"}
            </span>
            <span style={{ color: "var(--text)" }}>{dir}/</span>
          </button>
          {expanded.has(dir) && (
            <div style={{ paddingLeft: "18px" }}>
              {files.map((f) => (
                <div
                  key={f}
                  style={{ color: "var(--text-dim)", padding: "1px 0" }}
                >
                  {f}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: "10px",
          color: "var(--text-muted)",
          letterSpacing: "0.12em",
          marginBottom: "14px",
          fontWeight: 600,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

export default function UnderstandTab({ repoId }: { repoId: string }) {
  const [data, setData] = useState<UnderstandResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getUnderstanding(repoId)
      .then((d) => {
        setData(d);
        updateRepo(repoId, { understandDone: true });
      })
      .catch((e) => setError(e.message ?? "Failed to load understanding"));
  }, [repoId]);

  if (error) {
    return (
      <div
        style={{
          color: "var(--red-soft)",
          fontFamily: "var(--font-mono), monospace",
          fontSize: "13px",
          padding: "20px",
        }}
      >
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {[80, 50, 60].map((w, i) => (
          <div
            key={i}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "20px",
              height: "80px",
              animation: "shimmer 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <Section title="SUMMARY">
        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "13px",
            color: "var(--text)",
            lineHeight: 1.7,
          }}
        >
          {data.summary}
        </p>
      </Section>

      {data.key_concepts.length > 0 && (
        <Section title="KEY CONCEPTS">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {data.key_concepts.map((c) => (
              <span
                key={c}
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "12px",
                  padding: "4px 10px",
                  border: "1px solid var(--green)",
                  borderRadius: "4px",
                  color: "var(--green)",
                  opacity: 0.8,
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </Section>
      )}

      {Object.keys(data.language_breakdown).length > 0 && (
        <Section title="LANGUAGE BREAKDOWN">
          <BarChart data={data.language_breakdown} />
        </Section>
      )}

      {Object.keys(data.structure).length > 0 && (
        <Section title="FILE STRUCTURE">
          <FileTree structure={data.structure} />
        </Section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Visual test**

Start backend (`uvicorn app.main:app --reload` from `backend/`) and frontend (`npm run dev` from `frontend/`). Navigate to a READY repo's Understand tab. Verify:
- Skeleton shows briefly while loading
- Summary renders in monospace
- Key concept chips appear
- Language bar chart animates on render
- File tree is collapsible

- [ ] **Step 4: Commit**

```bash
git add app/components/UnderstandTab.tsx
git commit -m "feat: UnderstandTab — summary, key concepts, language bar chart, collapsible file tree"
```

---

## Task 14: ExploreTab (Chat Interface)

**Files:**
- Modify: `frontend/app/components/ExploreTab.tsx` (replace stub)

**Context:** Chat UI. Messages stored in localStorage. Backend is stateless — each request sends just `(repo_id, question)`. Typing indicator while waiting. Source chips below AI messages.

- [ ] **Step 1: Replace ExploreTab.tsx**

```tsx
// frontend/app/components/ExploreTab.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { explore } from "../lib/api";
import { getChat, appendMessage } from "../lib/repos";
import type { ChatMessage } from "../lib/types";

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: "4px", padding: "12px 0" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "var(--green)",
            animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite`,
            display: "inline-block",
          }}
        />
      ))}
    </div>
  );
}

export default function ExploreTab({ repoId }: { repoId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(getChat(repoId));
  }, [repoId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: q,
      timestamp: new Date().toISOString(),
    };
    const updated = [...messages, userMsg];
    setMessages(updated);
    appendMessage(repoId, userMsg);
    setInput("");
    setLoading(true);

    try {
      const res = await explore(repoId, q);
      const aiMsg: ChatMessage = {
        role: "assistant",
        content: res.answer,
        sources: res.sources,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      appendMessage(repoId, aiMsg);
    } catch (err) {
      const errMsg: ChatMessage = {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Failed to explore"}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "560px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {messages.length === 0 && !loading && (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "12px",
              marginTop: "80px",
              lineHeight: 2,
            }}
          >
            Ask anything about this codebase.
            <br />
            How does the auth flow work? What does X module do?
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              gap: "6px",
              maxWidth: "85%",
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {msg.role === "assistant" && (
              <span
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "10px",
                  color: "var(--green)",
                  opacity: 0.7,
                  letterSpacing: "0.1em",
                }}
              >
                &gt; AI
              </span>
            )}
            <div
              style={{
                background: msg.role === "user" ? "var(--green-muted)" : "var(--surface2)",
                border: `1px solid ${msg.role === "user" ? "rgba(0,255,135,0.2)" : "var(--border)"}`,
                borderRadius: "6px",
                padding: "10px 14px",
                fontFamily: "var(--font-mono), monospace",
                fontSize: "13px",
                color: "var(--text)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.content}
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {msg.sources.slice(0, 5).map((src, j) => (
                  <span
                    key={j}
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: "10px",
                      padding: "2px 6px",
                      border: "1px solid rgba(0,255,135,0.3)",
                      borderRadius: "3px",
                      color: "var(--green)",
                      opacity: 0.7,
                    }}
                  >
                    {src.length > 40 ? `…${src.slice(-38)}` : src}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: "flex-start" }}>
            <TypingIndicator />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          borderTop: "1px solid var(--border)",
          padding: "12px 16px",
          display: "flex",
          gap: "8px",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the codebase…"
          disabled={loading}
          style={{
            flex: 1,
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "8px 12px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "13px",
            color: "var(--text)",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            background: "transparent",
            border: "1px solid var(--green)",
            borderRadius: "6px",
            padding: "8px 16px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "12px",
            color: "var(--green)",
            cursor: loading ? "wait" : "pointer",
            letterSpacing: "0.05em",
            opacity: !input.trim() || loading ? 0.4 : 1,
          }}
        >
          SEND
        </button>
      </form>
    </div>
  );
}
```

Add to `globals.css`:
```css
@keyframes blink {
  0%, 100% { opacity: 0.2; }
  50%       { opacity: 1; }
}
```

- [ ] **Step 2: Verify**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Visual test with backend running**

Navigate to Explore tab of a READY repo. Verify:
- Empty state message shows when no messages
- Typing indicator shows while waiting for response
- AI response appears with source chips
- Chat scrolls to bottom automatically
- Reload page → previous messages persist (localStorage)

- [ ] **Step 4: Commit**

```bash
git add app/components/ExploreTab.tsx app/globals.css
git commit -m "feat: ExploreTab chat interface with localStorage persistence, typing indicator, source chips"
```

---

## Task 15: useImprovePoller Hook

**Files:**
- Create: `frontend/app/hooks/useImprovePoller.ts`

**Context:** Used by ImproveTab. Polls `/improve/{id}/status` every 2s while running.

- [ ] **Step 1: Create useImprovePoller.ts**

```ts
// frontend/app/hooks/useImprovePoller.ts
import { useEffect } from "react";
import { getImproveStatus } from "../lib/api";
import type { ImproveStatusResponse } from "../lib/types";

type Status = "pending" | "running" | "done" | "failed";

export function useImprovePoller(
  repoId: string,
  active: boolean,
  onUpdate: (data: ImproveStatusResponse) => void,
  onDone: () => void
) {
  useEffect(() => {
    if (!active) return;

    let stopped = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      if (stopped) return;
      try {
        const res = await getImproveStatus(repoId);
        onUpdate(res);
        if (res.status === "done" || res.status === "failed") {
          onDone();
          return;
        }
      } catch {
        // backend temporarily unavailable
      }
      if (!stopped) {
        timeoutId = setTimeout(poll, 2000);
      }
    }

    poll();
    return () => {
      stopped = true;
      clearTimeout(timeoutId);
    };
  }, [repoId, active, onUpdate, onDone]);
}
```

- [ ] **Step 2: Verify**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useImprovePoller.ts
git commit -m "feat: useImprovePoller hook — polls improve status, fires callbacks on update and completion"
```

---

## Task 16: FindingCard + ImproveTab

**Files:**
- Create: `frontend/app/components/FindingCard.tsx`
- Modify: `frontend/app/components/ImproveTab.tsx` (replace stub)

**Context:** ImproveTab has 4 states: idle → running (polling) → done (findings) → failed. FindingCard shows severity-coded finding with expandable explanation.

- [ ] **Step 1: Create FindingCard.tsx**

```tsx
// frontend/app/components/FindingCard.tsx
"use client";

import { useState } from "react";
import type { Finding } from "../lib/types";

const severityColor: Record<Finding["severity"], string> = {
  high: "var(--red-soft)",
  medium: "var(--amber)",
  low: "var(--steel)",
};

const severityLabel: Record<Finding["severity"], string> = {
  high: "HIGH",
  medium: "MED",
  low: "LOW",
};

export default function FindingCard({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false);
  const color = severityColor[finding.severity];

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${color}`,
        borderRadius: "6px",
        padding: "14px 16px",
        marginBottom: "8px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: "4px",
            }}
          >
            {finding.message}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            {finding.file}:{finding.line}
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "10px",
              fontWeight: 600,
              padding: "2px 8px",
              border: `1px solid ${color}`,
              borderRadius: "3px",
              color,
              letterSpacing: "0.08em",
            }}
          >
            {severityLabel[finding.severity]}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "10px",
              padding: "2px 8px",
              border: "1px solid var(--border2)",
              borderRadius: "3px",
              color: "var(--text-dim)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {finding.tool}
          </span>
        </div>
      </div>

      {finding.explanation && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-mono), monospace",
              fontSize: "11px",
              color: "var(--text-muted)",
              padding: "8px 0 0",
              letterSpacing: "0.05em",
            }}
          >
            {expanded ? "▾ hide explanation" : "▸ show explanation"}
          </button>
          {expanded && (
            <p
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "12px",
                color: "var(--text-dim)",
                lineHeight: 1.6,
                marginTop: "8px",
                paddingTop: "8px",
                borderTop: "1px solid var(--border)",
              }}
            >
              {finding.explanation}
            </p>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace ImproveTab.tsx**

```tsx
// frontend/app/components/ImproveTab.tsx
"use client";

import { useCallback, useState } from "react";
import { triggerImprove, getImprovements } from "../lib/api";
import { updateRepo } from "../lib/repos";
import { useImprovePoller } from "../hooks/useImprovePoller";
import FindingCard from "./FindingCard";
import type { Finding, ImproveStatusResponse } from "../lib/types";

const ALL_TOOLS = ["ruff", "bandit", "radon"];

type State = "idle" | "running" | "done" | "failed";

export default function ImproveTab({ repoId }: { repoId: string }) {
  const [state, setState] = useState<State>("idle");
  const [pollData, setPollData] = useState<ImproveStatusResponse | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState("");

  const handleUpdate = useCallback((data: ImproveStatusResponse) => {
    setPollData(data);
  }, []);

  const handleDone = useCallback(async () => {
    try {
      const res = await getImprovements(repoId);
      setFindings(res.findings);
      updateRepo(repoId, { improveFindingsCount: res.findings.length });
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load findings");
      setState("failed");
    }
  }, [repoId]);

  useImprovePoller(repoId, state === "running", handleUpdate, handleDone);

  async function startAnalysis() {
    setError("");
    setState("running");
    try {
      await triggerImprove(repoId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start analysis");
      setState("failed");
    }
  }

  /* ── Idle ── */
  if (state === "idle") {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "12px",
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            marginBottom: "12px",
          }}
        >
          STATIC ANALYSIS
        </div>
        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "13px",
            color: "var(--text-dim)",
            marginBottom: "24px",
            lineHeight: 1.6,
          }}
        >
          Runs Ruff (linting), Bandit (security), and Radon (complexity).
          <br />
          An AI agent orchestrates the tools and explains each finding.
        </p>
        <button
          onClick={startAnalysis}
          style={{
            background: "transparent",
            border: "1px solid var(--green)",
            borderRadius: "6px",
            padding: "10px 28px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--green)",
            cursor: "pointer",
            letterSpacing: "0.08em",
          }}
        >
          RUN ANALYSIS →
        </button>
      </div>
    );
  }

  /* ── Running ── */
  if (state === "running") {
    const toolsRun = pollData?.tools_run ?? [];
    const iterations = pollData?.iterations ?? 0;

    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "24px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "10px",
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
            marginBottom: "20px",
          }}
        >
          AGENT RUNNING — iteration {iterations}/5
        </div>

        {/* Iteration dots */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              style={{
                width: "28px",
                height: "4px",
                borderRadius: "2px",
                background: n <= iterations ? "var(--green)" : "var(--surface2)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        {/* Tool sequence */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {ALL_TOOLS.map((tool) => {
            const done = toolsRun.includes(tool);
            const active = !done && toolsRun.length < ALL_TOOLS.length;
            return (
              <div
                key={tool}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: done ? "var(--green)" : "var(--text-muted)", width: "16px" }}>
                  {done ? "✓" : "·"}
                </span>
                <span style={{ color: done ? "var(--text)" : "var(--text-muted)" }}>
                  {tool}
                </span>
                {active && !done && (
                  <span
                    style={{
                      fontSize: "10px",
                      color: "var(--amber)",
                      animation: "pulse 1.4s ease-in-out infinite",
                    }}
                  >
                    running…
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Failed ── */
  if (state === "failed") {
    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--red-soft)",
          borderRadius: "8px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: "13px",
            color: "var(--red-soft)",
            marginBottom: "16px",
          }}
        >
          Analysis failed: {error || "unknown error"}
        </p>
        <button
          onClick={() => setState("idle")}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "8px 20px",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "12px",
            color: "var(--text-dim)",
            cursor: "pointer",
          }}
        >
          RETRY
        </button>
      </div>
    );
  }

  /* ── Done ── */
  const high = findings.filter((f) => f.severity === "high");
  const medium = findings.filter((f) => f.severity === "medium");
  const low = findings.filter((f) => f.severity === "low");

  return (
    <div>
      {/* Summary bar */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "24px",
          padding: "14px 20px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          fontFamily: "var(--font-mono), monospace",
          fontSize: "13px",
        }}
      >
        <span>
          <span style={{ color: "var(--red-soft)", fontWeight: 600 }}>{high.length}</span>
          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}> HIGH</span>
        </span>
        <span>
          <span style={{ color: "var(--amber)", fontWeight: 600 }}>{medium.length}</span>
          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}> MEDIUM</span>
        </span>
        <span>
          <span style={{ color: "var(--steel)", fontWeight: 600 }}>{low.length}</span>
          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}> LOW</span>
        </span>
        <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "11px" }}>
          {findings.length} total findings
        </span>
      </div>

      {[...high, ...medium, ...low].map((f, i) => (
        <FindingCard key={i} finding={f} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Visual test**

With both backend and frontend running, go to a READY repo's Improve tab. Verify:
- Idle state shows description + RUN ANALYSIS button
- Clicking starts analysis, dots animate, tools check off as they complete
- After completion, findings cards appear grouped by severity (HIGH → MED → LOW)
- Click "show explanation" on a card — explanation expands

- [ ] **Step 5: Commit**

```bash
git add app/components/FindingCard.tsx app/components/ImproveTab.tsx app/hooks/useImprovePoller.ts
git commit -m "feat: ImproveTab (4 states, agent log, iteration dots) and FindingCard (severity-coded, expandable)"
```

---

## Task 17: not-found Page + Cleanup

**Files:**
- Create: `frontend/app/not-found.tsx`
- Delete: old panel components

- [ ] **Step 1: Create not-found.tsx**

```tsx
// frontend/app/not-found.tsx
"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--black)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        fontFamily: "var(--font-mono), monospace",
      }}
    >
      <div
        style={{
          fontSize: "64px",
          fontFamily: "var(--font-display), Syne, sans-serif",
          fontWeight: 800,
          color: "var(--border2)",
          letterSpacing: "-0.05em",
        }}
      >
        404
      </div>
      <p style={{ fontSize: "14px", color: "var(--text-dim)" }}>
        This page doesn't exist.
      </p>
      <Link
        href="/dashboard"
        style={{
          fontSize: "13px",
          color: "var(--green)",
          textDecoration: "none",
          border: "1px solid var(--green)",
          borderRadius: "6px",
          padding: "8px 20px",
          letterSpacing: "0.05em",
        }}
      >
        ← Dashboard
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Delete old panel components**

```bash
cd frontend
rm app/components/IngestPanel.tsx
rm app/components/UnderstandPanel.tsx
rm app/components/ExplorePanel.tsx
rm app/components/ImprovePanel.tsx
```

- [ ] **Step 3: Verify nothing imports deleted files**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run full lint**

```bash
npm run lint
```

Expected: no errors (or only warnings, not errors).

- [ ] **Step 5: End-to-end smoke test**

With both backend and frontend running:
1. Go to `http://localhost:3000` → GSAP animation plays
2. Enter `https://github.com/pallets/click` → redirects to `/dashboard`
3. Card appears in INGESTING state → transitions to READY
4. Click card → `/repos/{id}` with tab indicator
5. UNDERSTAND tab → summary loads
6. EXPLORE tab → ask a question → AI responds with sources
7. IMPROVE tab → run analysis → findings appear
8. Navigate to `/repos/nonexistent` → 404 page
9. Navigate to a random URL → 404 page

- [ ] **Step 6: Commit**

```bash
git add app/not-found.tsx
git rm app/components/IngestPanel.tsx app/components/UnderstandPanel.tsx app/components/ExplorePanel.tsx app/components/ImprovePanel.tsx
git commit -m "feat: 404 not-found page; remove legacy single-page panel components"
```

---

## Self-Review

### Spec coverage
- [x] Landing page — Task 7
- [x] Dashboard with card grid — Task 11
- [x] Empty state — Task 10 (EmptyDashboard)
- [x] Repo detail with 3 tabs — Task 12
- [x] Understand tab — Task 13
- [x] Explore tab with chat + localStorage persistence — Task 14
- [x] Improve tab (4 states) + FindingCard — Task 16
- [x] AddRepoModal — Task 10
- [x] Nav component — Task 6
- [x] not-found page — Task 17
- [x] useIngestPoller — Task 8
- [x] useImprovePoller — Task 15
- [x] Types — Task 2
- [x] API client — Task 3
- [x] localStorage helpers — Task 4
- [x] shadcn + framer-motion + GSAP install — Task 5
- [x] CSS variables + fonts + scanline — Task 1
- [x] Cleanup old components — Task 17

### Placeholder scan
No TBDs, no "implement later", no "similar to Task N" references. All code is complete.

### Type consistency
- `StoredRepo` defined in Task 2, used in Tasks 3, 4, 7, 9, 10, 11, 12
- `Finding` defined in Task 2, used in Tasks 16
- `ImproveStatusResponse` defined in Task 2, used in Tasks 15, 16
- API functions defined in Task 3, imported by exact name in Tasks 7, 10, 13, 14, 15, 16
- localStorage functions (`saveRepo`, `updateRepo`, `getRepos`, `getRepoById`, `getChat`, `appendMessage`) defined in Task 4, imported by exact name in Tasks 7, 10, 11, 12, 13, 14, 16

All consistent — no name mismatches.
