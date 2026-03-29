"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FormattedMathText } from "@/components/formatted-math-text";

type Choice = { id: string; label: string; text: string };
type Question = {
  id: string;
  prompt: string;
  passage: string | null;
  questionType: string;
  choices: Choice[];
  section: string;
  domain: string;
  skill: string;
  difficulty: string;
};

type Props = {
  attemptId: string;
  questions: Question[];
  module: number;
  section: string;
  totalTimeSeconds: number;
};

export default function BluebookExamClient({ attemptId, questions, module: moduleNum, section, totalTimeSeconds }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [struckChoices, setStruckChoices] = useState<Record<string, Set<string>>>({});
  const [timeLeft, setTimeLeft] = useState(totalTimeSeconds);
  const [showNav, setShowNav] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const currentQuestion = questions[currentIndex];

  // Countdown timer
  useEffect(() => {
    if (submitted) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const toggleFlag = (id: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleStrike = (questionId: string, choiceId: string) => {
    setStruckChoices((prev) => {
      const qStrikes = new Set(prev[questionId] ?? []);
      qStrikes.has(choiceId) ? qStrikes.delete(choiceId) : qStrikes.add(choiceId);
      return { ...prev, [questionId]: qStrikes };
    });
  };

  const handleAnswer = (questionId: string, choiceId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choiceId }));
  };

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      await fetch(`/api/exam/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, module: moduleNum, section })
      });
      setSubmitted(true);
      window.location.href = `/exam/${attemptId}/results?module=${moduleNum}&section=${section}`;
    } catch {
      setSubmitting(false);
    }
  }, [submitting, submitted, attemptId, answers, moduleNum, section]);

  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const timerWarning = timeLeft < 300; // last 5 min

  if (submitted) {
    return (
      <div className="bluebook-shell">
        <div className="bluebook-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div className="panel" style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
            <h2>Module {moduleNum} submitted!</h2>
            <p className="muted">Calculating your score…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bluebook-shell">
      {/* ── Header ── */}
      <header className="bluebook-header">
        <div className="bluebook-header-left">
          <span className="bluebook-section-label">
            {section === "READING_WRITING" ? "Reading & Writing" : "Math"} · Module {moduleNum}
          </span>
        </div>
        <div className="bluebook-header-center">
          <div className={`bluebook-timer ${timerWarning ? "timer-warning" : ""}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>
        <div className="bluebook-header-right">
          <button
            id="btn-question-nav"
            className="bluebook-nav-toggle"
            onClick={() => setShowNav(true)}
            title="Question navigator"
          >
            ☰ Questions
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="bluebook-content">
        {/* Passage pane (if applicable) */}
        {currentQuestion.passage ? (
          <div className="bluebook-split">
            <div className="bluebook-passage-pane">
              <p className="muted" style={{ fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                Passage
              </p>
              <div className="question-passage">
                <FormattedMathText text={currentQuestion.passage} />
              </div>
            </div>
            <div className="bluebook-question-pane">
              <QuestionContent
                question={currentQuestion}
                index={currentIndex}
                total={questions.length}
                flagged={flagged.has(currentQuestion.id)}
                struckChoices={struckChoices[currentQuestion.id] ?? new Set()}
                selectedChoice={answers[currentQuestion.id]}
                onFlag={() => toggleFlag(currentQuestion.id)}
                onStrike={(cId) => toggleStrike(currentQuestion.id, cId)}
                onAnswer={(cId) => handleAnswer(currentQuestion.id, cId)}
              />
            </div>
          </div>
        ) : (
          <div className="bluebook-single">
            <QuestionContent
              question={currentQuestion}
              index={currentIndex}
              total={questions.length}
              flagged={flagged.has(currentQuestion.id)}
              struckChoices={struckChoices[currentQuestion.id] ?? new Set()}
              selectedChoice={answers[currentQuestion.id]}
              onFlag={() => toggleFlag(currentQuestion.id)}
              onStrike={(cId) => toggleStrike(currentQuestion.id, cId)}
              onAnswer={(cId) => handleAnswer(currentQuestion.id, cId)}
            />
          </div>
        )}
      </main>

      {/* ── Footer nav ── */}
      <footer className="bluebook-footer">
        <button
          className="bluebook-btn"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
        >
          ← Back
        </button>
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          {answeredCount} of {questions.length} answered
        </span>
        {currentIndex < questions.length - 1 ? (
          <button className="bluebook-btn primary" onClick={() => setCurrentIndex((i) => i + 1)}>
            Next →
          </button>
        ) : (
          <button
            className="bluebook-btn primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : `Submit Module ${moduleNum}`}
          </button>
        )}
      </footer>

      {/* ── Question navigator modal ── */}
      {showNav && (
        <div className="bluebook-overlay" onClick={() => setShowNav(false)}>
          <div className="bluebook-nav-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>Question navigator</h3>
              <button className="bluebook-btn" onClick={() => setShowNav(false)}>✕</button>
            </div>
            <div className="bluebook-nav-grid">
              {questions.map((q, i) => {
                const isAnswered = Boolean(answers[q.id]);
                const isFlagged = flagged.has(q.id);
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={q.id}
                    className={`bluebook-nav-cell ${isAnswered ? "answered" : ""} ${isFlagged ? "flagged" : ""} ${isCurrent ? "current" : ""}`}
                    onClick={() => { setCurrentIndex(i); setShowNav(false); }}
                    title={`Q${i + 1}${isFlagged ? " (flagged)" : ""}${isAnswered ? " (answered)" : ""}`}
                  >
                    {isFlagged ? "🚩" : i + 1}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", fontSize: "0.8rem" }} className="muted">
              <span>🟦 Answered</span>
              <span>⬜ Unanswered</span>
              <span>🚩 Flagged</span>
            </div>
          </div>
        </div>
      )}

      <form ref={formRef} style={{ display: "none" }} />
    </div>
  );
}

function QuestionContent({
  question,
  index,
  total,
  flagged,
  struckChoices,
  selectedChoice,
  onFlag,
  onStrike,
  onAnswer
}: {
  question: Question;
  index: number;
  total: number;
  flagged: boolean;
  struckChoices: Set<string>;
  selectedChoice?: string;
  onFlag: () => void;
  onStrike: (choiceId: string) => void;
  onAnswer: (choiceId: string) => void;
}) {
  const [showStrikeMenu, setShowStrikeMenu] = useState<string | null>(null);

  return (
    <div className="bluebook-question-body">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <span className="muted" style={{ fontSize: "0.8rem" }}>
          Question {index + 1} of {total} · {question.domain} · {question.difficulty}
        </span>
        <button
          className={`bluebook-flag-btn ${flagged ? "active" : ""}`}
          onClick={onFlag}
          title="Flag for review"
        >
          {flagged ? "🚩 Flagged" : "⚑ Flag"}
        </button>
      </div>

      <div className="question-title">
        <FormattedMathText text={question.prompt} />
      </div>

      {question.questionType === "MULTIPLE_CHOICE" ? (
        <div className="choice-list" style={{ marginTop: "1.5rem" }}>
          {question.choices.map((choice) => {
            const isStruck = struckChoices.has(choice.id);
            const isSelected = selectedChoice === choice.id;
            return (
              <div key={choice.id} style={{ position: "relative" }}>
                <label
                  className={`bluebook-choice ${isSelected ? "selected" : ""} ${isStruck ? "struck" : ""}`}
                  onClick={() => { if (!isStruck) onAnswer(choice.id); }}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={choice.id}
                    checked={isSelected}
                    onChange={() => { if (!isStruck) onAnswer(choice.id); }}
                    style={{ display: "none" }}
                  />
                  <span className={`bluebook-choice-letter ${isSelected ? "selected" : ""}`}>
                    {choice.label}
                  </span>
                  <span style={{ textDecoration: isStruck ? "line-through" : "none", opacity: isStruck ? 0.4 : 1 }}>
                    <FormattedMathText text={choice.text} />
                  </span>
                  <button
                    type="button"
                    className="strike-btn"
                    title="Eliminate this choice"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStrike(choice.id); }}
                  >
                    {isStruck ? "↩" : "⊘"}
                  </button>
                </label>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="form-grid" style={{ marginTop: "1.5rem" }}>
          <label className="field">
            <span>Your answer</span>
            <input
              type="text"
              placeholder="Enter your answer"
              defaultValue={selectedChoice ?? ""}
              onChange={(e) => onAnswer(e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
