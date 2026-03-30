"use client";

import { useState } from "react";
import { InlineMath, BlockMath } from "react-katex";
import { CheckCircle2, Sparkles, Check } from "lucide-react";

type Choice = { label: string; text: string };

const DOMAINS: Record<string, string[]> = {
  READING_WRITING: ["Information and Ideas", "Craft and Structure", "Expression of Ideas", "Standard English Conventions"],
  MATH: ["Algebra", "Advanced Math", "Problem-Solving and Data Analysis", "Geometry and Trigonometry"]
};

function KatexPreview({ text }: { text: string }) {
  // Naively render inline $...$ and block $$...$$ delimiters
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          return <BlockMath key={i} math={part.slice(2, -2)} />;
        }
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          return <InlineMath key={i} math={part.slice(1, -1)} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export default function QuestionEditorClient({
  successId,
  constants
}: {
  successId?: string;
  constants: { domains: typeof DOMAINS };
}) {
  const [section, setSection] = useState<"READING_WRITING" | "MATH">("READING_WRITING");
  const [questionType, setQuestionType] = useState("MULTIPLE_CHOICE");
  const [prompt, setPrompt] = useState("");
  const [passage, setPassage] = useState("");
  const [explanation, setExplanation] = useState("");
  const [choices, setChoices] = useState<Choice[]>([
    { label: "A", text: "" },
    { label: "B", text: "" },
    { label: "C", text: "" },
    { label: "D", text: "" }
  ]);
  const [correctChoice, setCorrectChoice] = useState("A");
  const [generating, setGenerating] = useState(false);

  const domains = constants.domains[section] ?? [];

  async function generateExplanation() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/generate-explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          passage,
          choices: choices.map((c) => `${c.label}: ${c.text}`).join("\n"),
          correctChoice
        })
      });
      const data = await res.json();
      if (data.explanation) setExplanation(data.explanation);
    } catch {
      alert("Failed to generate explanation. Make sure GEMINI_API_KEY is set.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="card-grid" style={{ maxWidth: "860px", margin: "0 auto" }}>
      {successId && (
        <div className="panel" style={{ background: "rgba(34,197,94,0.1)", borderColor: "#22c55e", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <CheckCircle2 size={20} color="#22c55e" />
          <span>Question created successfully! ID: <code>{successId}</code></span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* ── Editor ── */}
        <form className="panel form-grid" action="/api/admin/questions" method="post">
          <h2 style={{ marginTop: 0 }}>Question editor</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <label className="field">
              <span>Section</span>
              <select name="section" value={section} onChange={(e) => setSection(e.target.value as "READING_WRITING" | "MATH")}>
                <option value="READING_WRITING">Reading & Writing</option>
                <option value="MATH">Math</option>
              </select>
            </label>
            <label className="field">
              <span>Difficulty</span>
              <select name="difficulty">
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <label className="field">
              <span>Domain</span>
              <select name="domain">
                {domains.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Skill</span>
              <input name="skill" type="text" placeholder="e.g. Linear equations" required />
            </label>
          </div>

          <label className="field">
            <span>Question type</span>
            <select name="questionType" value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
              <option value="MULTIPLE_CHOICE">Multiple choice</option>
              <option value="STUDENT_RESPONSE">Student response (grid-in)</option>
            </select>
          </label>

          <label className="field">
            <span>Passage (optional) — supports $LaTeX$</span>
            <textarea
              name="passage"
              rows={4}
              placeholder="Reading passage or context… Use $…$ for inline math, $$…$$ for display math."
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text)", padding: "0.85rem 1rem", fontFamily: "monospace", fontSize: "0.9rem" }}
            />
          </label>

          <label className="field">
            <span>Question prompt — supports $LaTeX$</span>
            <textarea
              name="prompt"
              rows={4}
              placeholder="Question text… Use $…$ for inline math."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text)", padding: "0.85rem 1rem", fontFamily: "monospace", fontSize: "0.9rem" }}
            />
          </label>

          {questionType === "MULTIPLE_CHOICE" ? (
            <>
              {choices.map((choice, i) => (
                <label key={choice.label} className="field">
                  <span>Choice {choice.label}</span>
                  <input
                    name={`choice${choice.label}`}
                    type="text"
                    placeholder={`Choice ${choice.label} text`}
                    value={choice.text}
                    onChange={(e) => {
                      const next = [...choices];
                      next[i] = { ...next[i], text: e.target.value };
                      setChoices(next);
                    }}
                  />
                </label>
              ))}
              <label className="field">
                <span>Correct choice</span>
                <select name="correctChoice" value={correctChoice} onChange={(e) => setCorrectChoice(e.target.value)}>
                  {choices.map((c) => <option key={c.label} value={c.label}>{c.label}</option>)}
                </select>
              </label>
            </>
          ) : (
            <label className="field">
              <span>Correct answer(s) — separate multiple with ;</span>
              <input name="correctTextAnswer" type="text" placeholder="e.g. 42 or 1/2;0.5" required />
            </label>
          )}

          <div>
            <label className="field" style={{ marginBottom: "0.5rem" }}>
              <span>Explanation (optional)</span>
              <textarea
                name="explanation"
                rows={4}
                placeholder="Step-by-step explanation…"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text)", padding: "0.85rem 1rem", fontSize: "0.9rem" }}
              />
            </label>
            <button
              type="button"
              className="button secondary"
              style={{ fontSize: "0.85rem", padding: "8px 18px", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
              onClick={generateExplanation}
              disabled={generating || !prompt}
            >
              <Sparkles size={16} />
              {generating ? "Generating…" : "AI-generate explanation"}
            </button>
          </div>

          <button className="button" type="submit" style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
            Create question
          </button>
        </form>

        {/* ── Live preview ── */}
        <div className="panel" style={{ position: "sticky", top: "6rem", alignSelf: "start" }}>
          <h2 style={{ marginTop: 0 }}>Live preview</h2>
          {passage && (
            <div className="question-passage" style={{ marginBottom: "1rem" }}>
              <KatexPreview text={passage} />
            </div>
          )}
          <div className="question-title">
            <KatexPreview text={prompt || "Your question will appear here…"} />
          </div>
          {questionType === "MULTIPLE_CHOICE" && (
            <div className="choice-list">
              {choices.map((c) => (
                <div key={c.label} className={`choice-item ${c.label === correctChoice ? "choice-correct-preview" : ""}`}>
                  <strong>{c.label}.</strong>{" "}
                  <KatexPreview text={c.text || `Choice ${c.label}`} />
                  {c.label === correctChoice && (
                    <Check size={14} color="#22c55e" style={{ marginLeft: "0.5rem" }} />
                  )}
                </div>
              ))}
            </div>
          )}
          {explanation && (
            <div className="explanation" style={{ marginTop: "1rem" }}>
              <strong style={{ fontSize: "0.9rem" }}>Explanation:</strong>
              <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
                <KatexPreview text={explanation} />
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
