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
