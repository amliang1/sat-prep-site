import { notFound } from "next/navigation";
import Link from "next/link";
import { FormattedMathText } from "@/components/formatted-math-text";
import { PracticeQuestionForm } from "@/components/practice-question-form";
import { requireUser } from "@/lib/auth";
import { formatSection } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getSessionQuestionSet } from "@/lib/session-questions";

type PracticeSessionPageProps = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ ids?: string }>;
};

const DIFFICULTY_CLASS: Record<string, string> = {
  EASY: "badge badge-easy",
  MEDIUM: "badge badge-medium",
  HARD: "badge badge-hard"
};

export default async function PracticeSessionPage({ params, searchParams }: PracticeSessionPageProps) {
  const user = await requireUser();
  const { sessionId } = await params;
  const resolvedSearchParams = await searchParams;

  const session = await prisma.practiceSession.findFirst({
    where: { id: sessionId, userId: user.id },
    include: { answers: true }
  });

  if (!session) notFound();

  const answeredCount = session.answers.length;
  const total = session.totalQuestions;
  const pct = total > 0 ? Math.round((session.correctAnswers / total) * 100) : 0;
  const fixedQuestionIdsFromQuery = resolvedSearchParams.ids
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean) ?? [];
  const fixedQuestionSet = fixedQuestionIdsFromQuery.length
    ? fixedQuestionIdsFromQuery
    : (await getSessionQuestionSet(session.id, user.id))?.questionIds ?? [];
  const answeredQuestionIds = new Set(session.answers.map((answer) => answer.questionId));
  const remainingFixedQuestionIds = fixedQuestionSet.filter((id) => !answeredQuestionIds.has(id));

  const nextQuestion = remainingFixedQuestionIds.length
    ? await prisma.question.findUnique({
        where: { id: remainingFixedQuestionIds[0] },
        include: { choices: { orderBy: { sortOrder: "asc" } } }
      })
    : await prisma.question.findFirst({
        where: {
          section: session.section ?? undefined,
          domain: session.domain ?? undefined,
          difficulty: session.difficulty ?? undefined,
          answers: { none: { sessionId: session.id } }
        },
        include: { choices: { orderBy: { sortOrder: "asc" } } }
      });

  /* ── Session complete screen ── */
  if (!nextQuestion || session.completedAt) {
    const emoji = pct >= 90 ? "🏆" : pct >= 75 ? "🌟" : pct >= 60 ? "👍" : pct >= 40 ? "💪" : "📚";
    return (
      <div className="score-card animate-fade-up">
        <span className="score-emoji">{emoji}</span>
        <p className="muted text-sm" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
          Session complete
        </p>
        <div className="score-fraction">
          {session.correctAnswers}<span style={{ opacity: 0.4, fontWeight: 400 }}>/{total}</span>
        </div>
        <p className="muted" style={{ marginTop: "0.5rem" }}>
          {formatSection(session.section ?? "READING_WRITING")} · {pct}% accuracy
        </p>

        {/* Mini accuracy bar */}
        <div className="bar-track" style={{ margin: "1.25rem auto", maxWidth: "280px" }}>
          <div
            className="bar-fill"
            style={{
              width: `${pct}%`,
              background: pct >= 75 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)"
            }}
          />
        </div>

        <div className="score-actions">
          <Link href="/practice" className="button">Practice again</Link>
          <Link href="/dashboard" className="button secondary">View analytics</Link>
        </div>

        {answeredCount < total && (
          <p className="muted text-xs" style={{ marginTop: "1rem" }}>
            {total - answeredCount} question{total - answeredCount !== 1 ? "s" : ""} were skipped (no matching questions found).
          </p>
        )}
      </div>
    );
  }

  /* ── Question screen ── */
  const questionIndex = answeredCount + 1;
  const hasPassage = Boolean(nextQuestion.passage);

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>

      {/* Progress steps */}
      <div className="progress-bar-wrapper">
        <div className="progress-steps">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`progress-step ${i < answeredCount ? "done" : i === answeredCount ? "active" : ""}`}
            />
          ))}
        </div>
        <p className="muted text-xs" style={{ marginTop: "0.4rem" }}>
          Question {questionIndex} of {total}
        </p>
      </div>

      <div className="panel" style={{ padding: "2rem" }}>
        {/* Meta chips */}
        <div className="question-meta">
          <span className="question-chip">{formatSection(nextQuestion.section)}</span>
          <span className="question-chip">{nextQuestion.domain}</span>
          <span className="question-chip">{nextQuestion.skill}</span>
          <span className={DIFFICULTY_CLASS[nextQuestion.difficulty] ?? "badge"}>
            {nextQuestion.difficulty.toLowerCase()}
          </span>
        </div>

        {/* Split layout if passage */}
        {hasPassage ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginTop: "0.75rem" }}>
            <div>
              <p className="muted text-xs" style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Passage
              </p>
              <div className="question-passage">
                <FormattedMathText text={nextQuestion.passage!} />
              </div>
            </div>
            <div>
              <FormattedMathText text={nextQuestion.prompt} className="question-title" />
              <PracticeQuestionForm
                action={`/api/practice/${session.id}/answer`}
                questionId={nextQuestion.id}
                choices={nextQuestion.choices}
                questionType={nextQuestion.questionType}
              />
            </div>
          </div>
        ) : (
          <>
            <FormattedMathText text={nextQuestion.prompt} className="question-title" />
            <PracticeQuestionForm
              action={`/api/practice/${session.id}/answer`}
              questionId={nextQuestion.id}
              choices={nextQuestion.choices}
              questionType={nextQuestion.questionType}
            />
          </>
        )}
      </div>
    </div>
  );
}
