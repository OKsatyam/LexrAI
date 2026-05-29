// frontend/app/lib/types.ts

export type RepoStatus = "ingesting" | "done" | "failed";

export interface StoredRepo {
  id: string;
  repoUrl: string;
  owner: string;
  name: string;
  status: RepoStatus;
  ingestedAt: string;
  understandDone: boolean;
  improveFindingsCount: number | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: string;
}

export interface IngestResponse {
  repo_id: string;
}

export interface IngestStatusResponse {
  status: string;    // "pending"|"cloning"|"chunking"|"indexing"|"analysing"|"generating"|"done"|"failed"
  progress: string;  // human-readable string e.g. "Cloning repository..."
}

export interface UnderstandResponse {
  repo_id: string;
  summary: string;
}

export interface Source {
  file: string;
  lines: string;
  snippet: string;
}

export interface ExploreResponse {
  answer: string;
  sources: Source[];
  conversation_id: string;
}

export interface Finding {
  tool: string;
  severity: string;
  file: string;
  line: number;
  message: string;
  explanation: string;
}

export interface ImproveStatusResponse {
  status: string;    // "idle"|"pending"|"running"|"done"|"failed"
  progress: string;  // human-readable string
}

export interface ImproveResponse {
  repo_id: string;
  findings: Finding[];
}
