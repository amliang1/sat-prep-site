import Link from "next/link";
import { notFound } from "next/navigation";
import { FormattedMathText } from "@/components/formatted-math-text";
import { PracticeQuestionForm } from "@/components/practice-question-form";
import { SocraticTutor } from "@/components/socratic-tutor";
import { requireUser } from "@/lib/auth";
import { formatSection } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { pickNextQuestion } from "@/lib/cat";
import { thetaToScaledScore } from "@/lib/irt";

type RouteProps = {
  params: Promise<{ attemptId: string }>;
};

const DIFFICULTY_CLASS: Record<string, string> = {
  EASY: "badge badge-easy",
  MEDIUM: "badge badge-medium",
  HARD: "badge badge-hard"
};

export default async function AdaptiveAttemptPage({ params }: RouteProps) {
  const user = await requireUser();
  const { attemptId } = await params;

  const attempt = await prisma.adaptiveAttempt.findFirst({
    where: { id: attemptId, userId: user.id },
    include: {
      responses: {
        orderBy: { position: "asc" },
        include: { question: { select: { difficulty: true, skill: true } } }
      }
    }
  });
  if (!attempt) notFound();

  const answered = attempt.responses.length;
  const correct = attempt.responses.filter((r) => r.isCorrect).length;
  const projectedScore = thetaToScaledScore(attempt.theta);

  /* ── Completed: show summary ── */
  if (attempt.completedAt) {
    const finalScore = attempt.scaledScore ?? projectedScore;
    const accuracyPct = answered > 0 ? Math.round((correct / answered) * 100) : 0;

    return (
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div className="score-card animate-fade-up">
          <span className="score-emoji">🎯</span>
          <p className="muted text-sm" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            Adaptive diagnostic complete
          </p>
          <div className="score-fraction" style={{ fontSize: "3.25rem" }}>{finalScore}</div>
          <p className="muted">
            {formatSection(attempt.section)} · SE ±{attempt.thetaSe.toFixed(2)} · {answered} questions · {accuracyPct}% correct
          </p>
          <div className="score-actions">
            <Link href="/cat/new" className="button">Take another</Link>
            <Link href="/practice" className="button secondary">Back to practice</Link>
          </div>
        </div>

        <section className="panel" style={{ marginTop: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Item-by-item</h2>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {attempt.responses.map((response) => (
              <div
                key={response.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr 90px 90px",
                  gap: "0.75rem",
                  alignItems: "center",
                  padding: "0.55rem 0.75rem",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem"
                }}
              >
                <span className="muted">#{response.position}</span>
                <span>{response.question.skill}</span>
                <span className={DIFFICULTY_CLASS[response.question.difficulty] ?? "badge"}>
                  {response.question.difficulty.toLowerCase()}
                </span>
                <span style={{ textAlign: "right", color: response.isCorrect ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                  {response.isCorrect ? "Correct" : "Wrong"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  /* ── In progress: serve next question ── */
  const nextQuestion = await pickNextQuestion(attempt.id, attempt.section, attempt.theta);
  if (!nextQuestion) {
    // Pool exhausted — finalise.
    await prisma.adaptiveAttempt.update({
      where: { id: attempt.id },
      data: { completedAt: new Date(), scaledScore: projectedScore }
    });
    return (
      <div className="score-card animate-fade-up" style={{ maxWidth: "720px", margin: "0 auto" }}>
        <span className="score-emoji">📚</span>
        <p className="muted">Out of unseen questions in this section.</p>
        <div className="score-actions">
          <Link href="/practice" className="button">Back to practice</Link>
        </div>
      </div>
    );
  }

  const hasPassage = Boolean(nextQuestion.passage);
  const progressPct = Math.min(
    100,
    Math.round((answered / attempt.maxQuestions) * 100)
  );

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      {/* Live estimate header */}
      <section className="panel" style={{ marginBottom: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
        <div>
          <div className="muted text-xs" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Question</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{answered + 1} / {attempt.maxQuestions}</div>
        </div>
        <div>
          <div className="muted text-xs" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Projected score</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--accent)" }}>
            {projectedScore}
            <span className="muted" style={{ fontSize: "0.75rem", fontWeight: 400, marginLeft: "0.4rem" }}>
              ±{Math.round(attempt.thetaSe * 100)}
            </span>
          </div>
        </div>
        <div>
          <div className="muted text-xs" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Precision (SE)</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>
            {attempt.thetaSe.toFixed(2)}
            <span className="muted" style={{ fontSize: "0.75rem", fontWeight: 400, marginLeft: "0.4rem" }}>
              target {attempt.seTarget.toFixed(2)}
            </span>
          </div>
        </div>
        <div>
          <div className="muted text-xs" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Accuracy so far</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{answered ? Math.round((correct / answered) * 100) : 0}%</div>
        </div>
      </section>

      <div className="progress-bar-wrapper">
        <div className="bar-track">
          <div className="bar-fill" style={{ width: `${progressPct}%`, background: "var(--accent)" }} />
        </div>
      </div>

      <div className="panel" style={{ padding: "2rem" }}>
        <div className="question-meta">
          <span className="question-chip">{formatSection(nextQuestion.section)}</span>
          <span className="question-chip">{nextQuestion.domain}</span>
          <span className="question-chip">{nextQuestion.skill}</span>
          <span className={DIFFICULTY_CLASS[nextQuestion.difficulty] ?? "badge"}>
            {nextQuestion.difficulty.toLowerCase()}
          </span>
        </div>

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
                action={`/api/cat/${attempt.id}/answer`}
                questionId={nextQuestion.id}
                choices={nextQuestion.choices}
                questionType={nextQuestion.questionType}
              />
              <SocraticTutor questionId={nextQuestion.id} />
            </div>
          </div>
        ) : (
          <>
            <FormattedMathText text={nextQuestion.prompt} className="question-title" />
            <PracticeQuestionForm
              action={`/api/cat/${attempt.id}/answer`}
              questionId={nextQuestion.id}
              choices={nextQuestion.choices}
              questionType={nextQuestion.questionType}
            />
            <SocraticTutor questionId={nextQuestion.id} />
          </>
        )}
      </div>

      <form action={`/api/cat/${attempt.id}/complete`} method="post" style={{ marginTop: "1rem", textAlign: "right" }}>
        <button type="submit" className="button ghost" style={{ fontSize: "0.85rem" }}>
          Finish early
        </button>
      </form>
    </div>
  );
}
