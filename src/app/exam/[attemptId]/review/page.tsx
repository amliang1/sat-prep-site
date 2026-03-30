import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FormattedMathText } from "@/components/formatted-math-text";
import { Check, X, ArrowLeft } from "lucide-react";

type Props = {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ module?: string; section?: string }>;
};

type AnswerDetail = { questionId: string; givenId: string; isCorrect: boolean };

export default async function ExamReviewPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const { attemptId } = await params;
  const { module: moduleStr = "1", section = "READING_WRITING" } = await searchParams;

  // Verify attempt belongs to user
  const attempt = await prisma.mockExamAttempt.findFirst({
    where: { id: attemptId, userId: user.id }
  });
  if (!attempt) notFound();

  // Load the submission event for this module
  const event = await prisma.analyticsEvent.findFirst({
    where: {
      userId: user.id,
      type: "MODULE_SUBMITTED",
      metadata: { contains: `"attemptId":"${attemptId}","module":${moduleStr}` }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!event?.metadata) {
    return (
      <div className="panel" style={{ maxWidth: 540, margin: "0 auto", textAlign: "center", padding: "2.5rem" }}>
        <p className="muted">No review data found for this module. Submit an exam first.</p>
        <Link href="/exam/new" className="button" style={{ marginTop: "1.5rem" }}>
          Start a new exam
        </Link>
      </div>
    );
  }

  const meta = JSON.parse(event.metadata);
  const answersDetail: AnswerDetail[] = meta.answersDetail ?? [];
  const correctCount: number = meta.correctCount ?? 0;
  const totalCount: number = meta.totalCount ?? answersDetail.length;

  // Fetch full question data for all answered questions
  const questionIds = answersDetail.map((a) => a.questionId);
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    include: { choices: { orderBy: { sortOrder: "asc" } } }
  });

  const questionMap = Object.fromEntries(questions.map((q) => [q.id, q]));
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  const sectionLabel = section === "READING_WRITING" ? "Reading & Writing" : "Math";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>

      {/* Header summary */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.25rem" }}>
            Module {moduleStr} — {sectionLabel}
          </h1>
          <p className="muted text-sm" style={{ marginTop: "0.25rem" }}>
            {correctCount}/{totalCount} correct · {accuracy}% accuracy
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <Link href={`/exam/${attemptId}/results?module=${moduleStr}&section=${section}`} className="button ghost" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <ArrowLeft size={16} />
            Results
          </Link>
          <Link href="/practice" className="button">Practice weak areas</Link>
        </div>
      </div>

      {/* Accuracy bar */}
      <div className="bar-track" style={{ marginBottom: "1.75rem" }}>
        <div
          className="bar-fill"
          style={{
            width: `${accuracy}%`,
            background: accuracy >= 75 ? "var(--green)" : accuracy >= 50 ? "var(--amber)" : "var(--red)"
          }}
        />
      </div>

      {/* Question-by-question review */}
      <div style={{ display: "grid", gap: "1rem" }}>
        {answersDetail.map((detail, idx) => {
          const q = questionMap[detail.questionId];
          if (!q) return null;

          const givenChoice = q.choices.find((c) => c.id === detail.givenId);
          const correctChoice = q.choices.find((c) => c.id === q.correctChoiceId);
          const explanation = q.aiExplanation ?? q.explanation;

          return (
            <div
              key={detail.questionId}
              className="panel"
              style={{
                borderLeft: `3px solid ${detail.isCorrect ? "var(--green)" : "var(--red)"}`,
              }}
            >
              {/* Question header */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    color: detail.isCorrect ? "var(--green)" : "var(--red)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem"
                  }}
                >
                  {detail.isCorrect ? <Check size={14} /> : <X size={14} />}
                  {detail.isCorrect ? "Correct" : "Incorrect"}
                </span>
                <span className="muted text-xs">Q{idx + 1}</span>
                <span className="question-chip">{q.domain}</span>
                <span className="question-chip">{q.skill}</span>
                <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty.toLowerCase()}</span>
              </div>

              {/* Passage (collapsed if long) */}
              {q.passage && (
                <details style={{ marginBottom: "0.75rem" }}>
                  <summary
                    style={{
                      cursor: "pointer",
                      color: "var(--muted)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.4rem"
                    }}
                  >
                    Show passage ▾
                  </summary>
                  <div className="question-passage" style={{ marginTop: "0.5rem" }}>
                    <FormattedMathText text={q.passage} />
                  </div>
                </details>
              )}

              {/* Prompt */}
              <div className="question-title" style={{ marginBottom: "1rem" }}>
                <FormattedMathText text={q.prompt} />
              </div>

              {/* Choices */}
              {q.questionType === "MULTIPLE_CHOICE" ? (
                <div style={{ display: "grid", gap: "0.4rem" }}>
                  {q.choices.map((choice) => {
                    const isGiven = choice.id === detail.givenId;
                    const isCorrectC = choice.id === q.correctChoiceId;
                    let bg = "var(--surface)";
                    let border = "var(--border)";
                    let labelColor = "var(--border-strong)";

                    if (isCorrectC) { bg = "var(--green-soft)"; border = "var(--green)"; labelColor = "var(--green)"; }
                    else if (isGiven && !isCorrectC) { bg = "var(--red-soft)"; border = "var(--red)"; labelColor = "var(--red)"; }

                    return (
                      <div
                        key={choice.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.65rem",
                          border: `1px solid ${border}`,
                          borderRadius: "var(--radius-sm)",
                          padding: "0.6rem 0.85rem",
                          background: bg,
                          fontSize: "0.875rem"
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            border: `1px solid ${labelColor}`,
                            color: labelColor,
                            fontWeight: 700,
                            fontSize: "0.72rem",
                            flexShrink: 0
                          }}
                        >
                          {choice.label}
                        </span>
                        <span style={{ flex: 1 }}>
                          <FormattedMathText text={choice.text} />
                        </span>
                        {isCorrectC && <span style={{ fontWeight: 700, color: "var(--green)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>Correct</span>}
                        {isGiven && !isCorrectC && <span style={{ fontWeight: 700, color: "var(--red)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>Your answer</span>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: "0.875rem" }}>
                  <p>
                    <strong>Your answer:</strong>{" "}
                    <span style={{ color: detail.isCorrect ? "var(--green)" : "var(--red)" }}>
                      {detail.givenId || "—"}
                    </span>
                  </p>
                  {!detail.isCorrect && (
                    <p style={{ marginTop: "0.3rem" }}>
                      <strong>Correct answer:</strong>{" "}
                      <span style={{ color: "var(--green)" }}>{q.correctTextAnswer}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Explanation */}
              {explanation && (
                <details className="explanation" open={!detail.isCorrect}>
                  <summary>Explanation</summary>
                  <p>{explanation}</p>
                </details>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link href="/practice" className="button">Practice weak areas</Link>
        <Link href="/exam/new" className="button secondary">Take another exam</Link>
        <Link href="/dashboard" className="button ghost">Dashboard</Link>
      </div>
    </div>
  );
}
