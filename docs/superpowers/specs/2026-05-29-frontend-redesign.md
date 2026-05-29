# LexrAI Frontend Redesign — Design Spec

## Overview

Full redesign of the Next.js frontend from a single-page app to a multi-page application with a terminal-noir aesthetic. No authentication. All state persisted in `localStorage`. Backend is unchanged — frontend only sends requests and renders results.

---

## Design Direction

**Terminal-noir.** Cursor × Linear × Bloomberg Terminal.

- **Background:** `#050709` (near-black)
- **Surfaces:** `#0b0e12`, `#111418`, `#171c22`
- **Borders:** `#1e2530`, `#252d38`
- **Accent:** `#00ff87` (electric green)
- **Warning:** `#f59e0b` (amber)
- **Error:** `#f87171` (red muted)
- **Text:** `#e2e8f0` (primary), `#64748b` (dim), `#334155` (muted)
- **Fonts:** Syne (display, headings) + IBM Plex Mono (body, code, UI)
- **Effects:** scanline CSS overlay, radial green glow on hero, circuit-trace SVG corner decorations on cards

---

## Tech Stack

- **Framework:** Next.js 16.2.6 (App Router), React 19
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui (themed to terminal-noir)
- **Animation:** Framer Motion (page transitions, card hovers, tab indicator)
- **Hero animation:** GSAP (landing page text reveal, stagger)
- **State:** React `useState` / `useEffect`, `localStorage` for persistence
- **API:** centralised `app/lib/api.ts`

---

## File Structure

```
frontend/
  app/
    globals.css              # CSS variables, fonts, scanline, base reset
    layout.tsx               # Root layout — font imports, metadata, nav shell
    page.tsx                 # Landing page (/)
    not-found.tsx            # 404 page
    dashboard/
      page.tsx               # Repo card grid (/dashboard)
    repos/
      [id]/
        page.tsx             # Repo detail with tabs (/repos/[id])
    components/
      Nav.tsx                # Top navigation bar (logo + optional links)
      RepoCard.tsx           # Single repo card (status chip, circuit corners)
      AddRepoModal.tsx       # shadcn Dialog — GitHub URL input + submit
      UnderstandTab.tsx      # Summary, key concepts, file tree
      ExploreTab.tsx         # Chat interface — messages, input, source chips
      ImproveTab.tsx         # Trigger, agent log, findings cards
      FindingCard.tsx        # Single finding — severity badge, tool, message
      SkeletonCard.tsx       # Loading placeholder for repo grid
      EmptyDashboard.tsx     # Zero-repos first-visit prompt
    lib/
      api.ts                 # All backend fetch calls, typed
      repos.ts               # localStorage read/write helpers
      types.ts               # Shared TypeScript types
    hooks/
      useRepo.ts             # Hook — load repo from localStorage by id
      useIngestPoller.ts     # Hook — poll /ingest/{id}/status, update localStorage
      useImprovePoller.ts    # Hook — poll /improve/{id}/status
```

---

## Routing

| Route | Page | Description |
|---|---|---|
| `/` | `app/page.tsx` | Landing — hero, URL input, stats |
| `/dashboard` | `app/dashboard/page.tsx` | Repo grid + add modal |
| `/repos/[id]` | `app/repos/[id]/page.tsx` | 3-tab repo detail |
| `*` | `app/not-found.tsx` | 404 fallback |

---

## localStorage Schema

```ts
// key: "lexrai_repos"
type StoredRepo = {
  id: string;           // UUID generated on ingest response
  repoUrl: string;      // e.g. "https://github.com/pallets/click"
  owner: string;        // "pallets"
  name: string;         // "click"
  status: "ingesting" | "done" | "failed";
  ingestedAt: string;   // ISO timestamp
  understandDone: boolean;
  improveFindingsCount: number | null;
};

// key: "lexrai_chat_{repoId}"
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];   // source chunk ids from explore response
  timestamp: string;
};
```

---

## TypeScript Types (`app/lib/types.ts`)

```ts
export type RepoStatus = "ingesting" | "done" | "failed";

export type StoredRepo = { ... };   // as above
export type ChatMessage = { ... };  // as above

export type IngestStatusResponse = {
  repo_id: string;
  status: "pending" | "running" | "done" | "failed";
  progress: number;        // 0–100
  error?: string;
};

export type UnderstandResponse = {
  repo_id: string;
  summary: string;
  key_concepts: string[];
  structure: Record<string, string[]>;  // dir → files
  language_breakdown: Record<string, number>;
};

export type ExploreResponse = {
  repo_id: string;
  answer: string;
  sources: string[];
};

export type Finding = {
  tool: "ruff" | "bandit" | "radon";
  severity: "high" | "medium" | "low";
  file: string;
  line: number;
  message: string;
  explanation: string;
};

export type ImproveStatusResponse = {
  repo_id: string;
  status: "pending" | "running" | "done" | "failed";
  progress: number;
  tools_run: string[];
  iterations: number;
};

export type ImproveResponse = {
  repo_id: string;
  findings: Finding[];
};
```

---

## API Client (`app/lib/api.ts`)

Single module. All functions `async`, return typed responses, throw on non-2xx.

```ts
const BASE = "http://localhost:8000";

ingestRepo(repoUrl: string): Promise<{ repo_id: string }>
getIngestStatus(repoId: string): Promise<IngestStatusResponse>
getUnderstanding(repoId: string): Promise<UnderstandResponse>
explore(repoId: string, question: string): Promise<ExploreResponse>
triggerImprove(repoId: string): Promise<{ repo_id: string }>
getImproveStatus(repoId: string): Promise<ImproveStatusResponse>
getImprovements(repoId: string): Promise<ImproveResponse>
```

---

## Page Designs

### Landing (`/`)

**Layout:** Full-viewport, vertically and horizontally centred content, no nav bar.

**Background:** `#050709` with:
- CSS grid lines (1px, `#1e2530`, 40px spacing) — very faint
- Scanline overlay (`body::before`, CSS repeating-linear-gradient)
- One radial green glow (`#00ff87`, 5% opacity, 600px radius) behind hero

**GSAP animation sequence (on mount):**
1. `t=0` — logo fades in (`opacity: 0→1`, `y: -10→0`, 0.4s ease-out)
2. `t=0.2` — heading stagger (`"Read code like a"` then `"senior dev."`, each word staggers in, 0.05s per word)
3. `t=0.8` — subtext fades in
4. `t=1.0` — input row fades in + slight y translate

**Content:**
```
[LEXR AI]

Read code like a
senior dev.

Understand any codebase in under 60 seconds.
Explore. Question. Improve.

[ github.com/owner/repo _____________ ]  [ ANALYSE → ]

◆ 90% Hit@3  ◆ 3 pillars  ◆ <60s ingest
```

**Heading:** Syne 800, 72px. `"senior dev."` in green `#00ff87`.
**Subtext:** IBM Plex Mono 400, 16px, `#64748b`.
**Input:** Dark border (`#1e2530`), background `#0b0e12`, green focus ring. Full width up to 560px.
**Button:** Green border + green text. Hover: filled green bg, black text. `cursor: pointer`.

**On submit:**
1. Validate URL matches `github.com/owner/repo` pattern — inline error if invalid
2. Call `api.ingestRepo(url)`
3. Save returned `repo_id` + parsed owner/name to localStorage as `status: "ingesting"`
4. Redirect to `/dashboard`

---

### Dashboard (`/dashboard`)

**Nav:** `Nav.tsx` — `[LEXR AI]` logo left (Syne, green square bullet), right: nothing (no auth).

**Content below nav:**

If no repos in localStorage → render `EmptyDashboard.tsx`:
```
┌──────────────────────────────┐
│  No repositories yet.        │
│                              │
│  Paste a GitHub URL on the   │
│  landing page to get started │
│                              │
│  [ ← Back to landing ]       │
└──────────────────────────────┘
```
Centred, Framer Motion fade-in.

If repos exist → CSS grid of `RepoCard` components + one `AddRepoCard` at end.

**RepoCard:**
- Circuit-trace SVG corners (decorative, green, 12px)
- Top-left: owner/name in IBM Plex Mono bold
- Top-right: status chip — `INGESTING` (amber, pulsing dot), `READY` (green), `FAILED` (red)
- Middle: repo URL in muted text, ingest date
- Bottom: pill badges — `UNDERSTOOD`, `EXPLORED`, `ANALYSED` only if those operations have been run
- Hover: Framer Motion `whileHover` `y: -4`, `borderColor: #00ff87`
- Click: navigate to `/repos/[id]`
- If `status === "ingesting"`: show progress bar (polls via `useIngestPoller`)

**AddRepoCard:**
- Same card size, dashed green border, `+` icon centred, `ADD REPOSITORY` label
- Click: opens `AddRepoModal`

**AddRepoModal (shadcn Dialog):**
- Dark themed dialog
- GitHub URL input + `ANALYSE` button
- Same validation + ingest flow as landing submit
- On success: closes modal, new card appears in grid in `INGESTING` state

---

### Repo Detail (`/repos/[id]`)

**Back link:** `← Dashboard` top-left, IBM Plex Mono, muted, hover green.

**Repo header:**
```
pallets / click
https://github.com/pallets/click  · Ingested 2026-05-29
```

**Tabs:** `UNDERSTAND` · `EXPLORE` · `IMPROVE`
- IBM Plex Mono uppercase, letter-spacing
- Active tab: green text + green underline bar
- Underline slides between tabs via Framer Motion `layoutId="tab-indicator"`

#### UNDERSTAND tab

On mount: call `api.getUnderstanding(repoId)`. Show skeleton while loading.

Sections:
1. **Summary** — full-width card, LLM summary text, IBM Plex Mono
2. **Key Concepts** — horizontal chip row, each chip `[concept]` in green border
3. **Language Breakdown** — small bar chart (CSS, no library), language name + percentage
4. **File Structure** — collapsible directory tree, monospace, indent levels

#### EXPLORE tab

**Chat layout:** messages fill vertically, input pinned to bottom.

**Message rendering:**
- User messages: right-aligned, dark green bubble (`#00ff87` at 8% opacity), text in `#e2e8f0`
- AI messages: left-aligned, `#111418` bubble, green `>` prefix in IBM Plex Mono
- Source chips below AI message: small green-bordered pills `[file.py:42]`
- Typing indicator: three blinking green dots while waiting for response

**Input:** full-width text input + `SEND` button (or Enter). Disabled while response in flight.

**Persistence:** conversation stored in `localStorage` under key `lexrai_chat_{repoId}`. Loaded on mount, appended on each exchange.

**On send:**
1. Append user message to state + localStorage
2. Show typing indicator
3. Call `api.explore(repoId, question)`
4. Append AI response + sources to state + localStorage

#### IMPROVE tab

**States:**
1. **Idle** (never run): `RUN ANALYSIS` button, description text
2. **Running:** Agent log — shows tool sequence as they complete (`✓ ruff  ✓ bandit  · radon…`), 5-dot iteration indicator, current iteration / max
3. **Done:** Findings grid — `FindingCard` per finding, grouped by severity (HIGH first)
4. **Failed:** Error message + retry button

**FindingCard:**
- Left border colour = severity (red HIGH, amber MEDIUM, steel LOW)
- Tool badge top-right
- File + line in IBM Plex Mono muted
- Message bold
- Explanation below in dim text, collapsible if long

**Polling:** `useImprovePoller` polls `/improve/{id}/status` every 2s while status is `pending` or `running`.

---

## Animations Summary

| Interaction | Library | Detail |
|---|---|---|
| Landing hero reveal | GSAP | Stagger per word, 0.05s delay |
| Page route transitions | Framer Motion | `opacity` 0→1, `y` 8→0, 0.25s |
| Tab indicator slide | Framer Motion | `layoutId="tab-indicator"` |
| Card hover lift | Framer Motion | `whileHover: { y: -4 }` |
| Dashboard empty → cards | Framer Motion | `staggerChildren` 0.05s |
| Typing indicator | CSS | `@keyframes blink` on 3 dots |
| Ingest progress bar | CSS transition | `width` on `transition: width 0.3s` |

---

## Error States

| Scenario | Behaviour |
|---|---|
| Invalid GitHub URL (landing/modal) | Inline red error below input, no API call |
| Ingest fails | Card status → `FAILED` (red chip), hover tooltip with error |
| Understand fails | Error card with retry button in tab |
| Explore API fails | Error message in chat bubble, retry not automatic |
| Improve fails | Error state in Improve tab with retry button |
| Unknown repo ID in URL | Redirect to `/not-found` |
| Backend unreachable | Toast notification (shadcn `Sonner`) — "Backend offline" |

---

## shadcn Components Used

- `Dialog` — AddRepoModal
- `Button` — all buttons (themed)
- `Input` — all text inputs (themed)
- `Tabs` — NOT used (custom implementation for animated indicator)
- `Badge` — status chips, language pills
- `Skeleton` — loading placeholders
- `Sonner` (toast) — backend error notifications
- `Collapsible` — file tree, long finding explanations

---

## Spec Self-Review Checklist

- [x] Auth: none — no protected routes, no session logic
- [x] Routing: 4 routes defined with exact file paths
- [x] localStorage schema fully typed — no ambiguity
- [x] API client typed end-to-end — matches backend endpoints
- [x] Empty state designed (dashboard)
- [x] All loading states specified (skeleton, typing indicator, progress bar)
- [x] All error states specified
- [x] GSAP: landing only — not spread across app
- [x] Framer Motion: transitions, hovers, tab indicator
- [x] shadcn: components listed, custom tab avoided (animated indicator needs custom)
- [x] Chat history persisted in localStorage
- [x] Fonts: Syne + IBM Plex Mono — loaded in layout
- [x] CSS variables: defined in globals.css
- [x] Not-found page: defined
- [x] No auth = no profile page, no protected redirect logic
- [x] No contradictions between sections
- [x] No TBDs or placeholder requirements
