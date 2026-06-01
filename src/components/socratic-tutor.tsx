"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Eye, X } from "lucide-react";
import { FormattedMathText } from "@/components/formatted-math-text";

type Message = { role: "user" | "assistant"; content: string };

type RevealPayload = {
  correctChoice: { label: string; text: string } | null;
  correctTextAnswer: string | null;
  explanation: string | null;
};

export function SocraticTutor({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, pending]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    setInput("");
    setError(null);
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setPending(true);
    try {
      const res = await fetch(`/api/socratic/${questionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Tutor unavailable");
      }
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tutor unavailable");
    } finally {
      setPending(false);
    }
  }

  async function revealAnswer() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/socratic/${questionId}/reveal`, { method: "POST" });
      const data = (await res.json()) as RevealPayload | { error: string };
      if (!res.ok) throw new Error((data as { error: string }).error || "Unable to load");
      setReveal(data as RevealPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <div style={{ marginTop: "1rem", textAlign: "right" }}>
        <button
          type="button"
          className="button ghost"
          onClick={() => setOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}
        >
          <Sparkles size={14} />
          Stuck? Ask the Socratic tutor
        </button>
      </div>
    );
  }

  return (
    <div
      className="panel"
      style={{
        marginTop: "1.25rem",
        padding: "1rem 1.1rem",
        background: "var(--surface)",
        border: "1px solid var(--border-strong)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
          <Sparkles size={16} style={{ color: "var(--accent)" }} />
          Socratic tutor
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close tutor"
          style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
        >
          <X size={16} />
        </button>
      </div>

      <p className="muted text-xs" style={{ margin: "0 0 0.6rem" }}>
        I&apos;ll nudge you toward the answer — I won&apos;t give it away. Tell me what you&apos;re thinking.
      </p>

      <div
        ref={scrollerRef}
        style={{
          maxHeight: "260px",
          overflowY: "auto",
          display: "grid",
          gap: "0.5rem",
          padding: "0.5rem",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)"
        }}
      >
        {messages.length === 0 && !reveal ? (
          <p className="muted text-xs" style={{ margin: 0 }}>
            Start by sharing what part of the question is tripping you up.
          </p>
        ) : null}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              justifySelf: m.role === "user" ? "end" : "start",
              maxWidth: "92%",
              padding: "0.55rem 0.75rem",
              borderRadius: "var(--radius-sm)",
              background: m.role === "user" ? "var(--accent-soft)" : "var(--surface)",
              border: "1px solid var(--border)",
              fontSize: "0.88rem",
              lineHeight: 1.5
            }}
          >
            {m.role === "assistant" ? <FormattedMathText text={m.content} /> : m.content}
          </div>
        ))}

        {pending ? (
          <div className="muted text-xs" style={{ padding: "0.4rem 0.5rem" }}>Thinking…</div>
        ) : null}

        {reveal ? (
          <div
            style={{
              marginTop: "0.4rem",
              padding: "0.75rem",
              border: "1px solid var(--green)",
              background: "var(--green-soft)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.88rem"
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "0.35rem" }}>
              Correct answer:{" "}
              {reveal.correctChoice
                ? `${reveal.correctChoice.label}. ${reveal.correctChoice.text}`
                : reveal.correctTextAnswer ?? "—"}
            </div>
            {reveal.explanation ? <FormattedMathText text={reveal.explanation} /> : null}
          </div>
        ) : null}

        {error ? (
          <div className="text-xs" style={{ color: "var(--red)", padding: "0.4rem 0.5rem" }}>{error}</div>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="What are you noticing in the problem?"
          disabled={pending}
          style={{
            flex: 1,
            padding: "0.55rem 0.75rem",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg)",
            color: "var(--text)",
            fontSize: "0.9rem"
          }}
        />
        <button
          type="button"
          className="button"
          disabled={pending || !input.trim()}
          onClick={send}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.55rem 0.85rem", fontSize: "0.85rem" }}
        >
          <Send size={14} />
        </button>
      </div>

      <div style={{ marginTop: "0.55rem", textAlign: "right" }}>
        <button
          type="button"
          className="button ghost"
          onClick={revealAnswer}
          disabled={pending || reveal !== null}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem" }}
        >
          <Eye size={13} />
          {reveal ? "Answer revealed" : "Reveal answer"}
        </button>
      </div>
    </div>
  );
}
