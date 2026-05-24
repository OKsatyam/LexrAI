"use client";

import { useState } from "react";

const API = "http://localhost:8000";

interface Source {
  file: string;
  lines: string;
  snippet: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

interface Props {
  repoId: string;
}

export default function ExplorePanel({ repoId }: Props) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);

    const res = await fetch(`${API}/explore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo_id: repoId,
        question: q,
        conversation_id: conversationId,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.detail}` }]);
      return;
    }
    setConversationId(data.conversation_id);
    setMessages((prev) => [...prev, {
      role: "assistant",
      content: data.answer,
      sources: data.sources,
    }]);
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">Explore</h2>

      <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div className={`inline-block rounded-xl px-4 py-2 text-sm max-w-[85%] ${
              m.role === "user" ? "bg-blue-600" : "bg-gray-800"
            }`}>
              {m.content}
            </div>
            {m.sources && m.sources.length > 0 && (
              <div className="mt-1 text-xs text-gray-500 space-x-2">
                {m.sources.map((s, j) => (
                  <span key={j} className="bg-gray-800 px-2 py-0.5 rounded">
                    {s.file}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="text-gray-500 text-sm">Thinking...</div>}
      </div>

      <div className="flex gap-3">
        <input
          className="flex-1 bg-gray-800 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask about the codebase..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          disabled={loading}
        />
        <button
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-5 py-2 text-sm font-medium"
          onClick={handleAsk}
          disabled={loading || !question.trim()}
        >
          Ask
        </button>
      </div>
    </div>
  );
}
