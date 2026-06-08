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

export function deleteRepo(id: string): void {
  const repos = getRepos().filter((r) => r.id !== id);
  localStorage.setItem(REPOS_KEY, JSON.stringify(repos));
  localStorage.removeItem(`lexrai_chat_${id}`);
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
