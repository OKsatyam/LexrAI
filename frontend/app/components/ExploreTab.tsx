"use client";

import { useEffect, useRef, useState } from "react";
import { explore } from "../lib/api";
import { getChat, appendMessage } from "../lib/repos";
import type { ChatMessage, Source } from "../lib/types";

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

function SourceChip({ source }: { source: Source }) {
  const label = source.lines ? `${source.file}:${source.lines}` : source.file;
  return (
    <span
      title={source.snippet}
      style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: "10px",
        padding: "2px 6px",
        border: "1px solid rgba(0,255,135,0.3)",
        borderRadius: "3px",
        color: "var(--green)",
        opacity: 0.7,
        cursor: "help",
        maxWidth: "200px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {label.length > 40 ? `…${label.slice(-38)}` : label}
    </span>
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
    setMessages((prev) => [...prev, userMsg]);
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
                  <SourceChip key={j} source={src} />
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
