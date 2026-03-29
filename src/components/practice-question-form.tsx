"use client";

import { useEffect, useState } from "react";
import { FormattedMathText } from "@/components/formatted-math-text";

type Choice = {
  id: string;
  label: string;
  text: string;
};

export function PracticeQuestionForm({
  action,
  questionId,
  choices,
  questionType
}: {
  action: string;
  questionId: string;
  choices: Choice[];
  questionType: string;
}) {
  const [renderedAt, setRenderedAt] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setRenderedAt(String(Date.now()));
  }, []);

  return (
    <form action={action} method="post" style={{ marginTop: "1.5rem" }}>
      <input name="questionId" type="hidden" value={questionId} />
      <input name="renderedAtMs" type="hidden" value={renderedAt} />

      {questionType === "STUDENT_RESPONSE" ? (
        <div style={{ display: "grid", gap: "1rem" }}>
          <label className="field">
            <span>Your answer</span>
            <input
              required
              name="responseText"
              placeholder="Type your answer exactly as requested"
              style={{ fontSize: "1rem" }}
            />
          </label>
          <button className="button" type="submit">Submit answer →</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.6rem" }}>
          {choices.map((choice) => {
            const isSelected = selected === choice.id;
            return (
              <label
                key={choice.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.85rem",
                  border: `1px solid ${isSelected ? "var(--accent)" : "var(--border-strong)"}`,
                  borderRadius: "var(--radius-sm)",
                  padding: "0.85rem 1rem",
                  background: isSelected ? "var(--accent-soft)" : "var(--surface)",
                  cursor: "pointer",
                  transition: "border-color 0.12s, background 0.12s"
                }}
              >
                <input
                  required
                  type="radio"
                  name="choiceId"
                  value={choice.id}
                  onChange={() => setSelected(choice.id)}
                  style={{ display: "none" }}
                />
                {/* Circle letter */}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    border: `1px solid ${isSelected ? "var(--accent)" : "var(--border-strong)"}`,
                    background: isSelected ? "var(--accent)" : "transparent",
                    color: isSelected ? "#fff" : "var(--accent)",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    flexShrink: 0,
                    transition: "all 0.12s"
                  }}
                >
                  {choice.label}
                </span>
                <span style={{ flex: 1, lineHeight: 1.55, fontSize: "0.95rem" }}>
                  <FormattedMathText text={choice.text} />
                </span>
              </label>
            );
          })}
          <button
            className="button"
            type="submit"
            disabled={!selected}
            style={{ marginTop: "0.5rem" }}
          >
            Submit answer →
          </button>
        </div>
      )}
    </form>
  );
}
