// frontend/app/lib/api.ts
import type {
  IngestResponse,
  IngestStatusResponse,
  UnderstandResponse,
  ExploreResponse,
  ImproveStatusResponse,
  ImproveResponse,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

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
    body: JSON.stringify({ github_url: repoUrl }),
  });
}

// ingestLocal (path-based) removed — replaced by ingestUpload (browser file picker)

export async function ingestUpload(files: FileList): Promise<IngestResponse> {
  const form = new FormData();
  for (const file of Array.from(files)) {
    // webkitRelativePath preserves folder structure (e.g. "myapp/src/main.py")
    form.append("files", file, file.webkitRelativePath || file.name);
  }
  const res = await fetch(`${BASE}/ingest/upload`, {
    method: "POST",
    body: form,
    // No Content-Type — browser sets multipart/form-data + boundary automatically
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<IngestResponse>;
}

export function getIngestStatus(repoId: string): Promise<IngestStatusResponse> {
  return req(`/ingest/${repoId}/status`);
}

export function getUnderstanding(repoId: string): Promise<UnderstandResponse> {
  return req(`/understand?repo_id=${repoId}`);
}

export function explore(
  repoId: string,
  question: string,
  conversationId?: string,
): Promise<ExploreResponse> {
  return req("/explore", {
    method: "POST",
    body: JSON.stringify({
      repo_id: repoId,
      question,
      ...(conversationId ? { conversation_id: conversationId } : {}),
    }),
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
