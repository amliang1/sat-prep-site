import { notFound } from "next/navigation";
import { PracticeQuestionForm } from "@/components/practice-question-form";
import { requireUser } from "@/lib/auth";
import { formatSection } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

type PracticeSessionPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function PracticeSessionPage({ params }: PracticeSessionPageProps) {
  const user = await requireUser();
  const { sessionId } = await params;

  const session = await prisma.practiceSession.findFirst({
    where: { id: sessionId, userId: user.id },
    include: {
      answers: true
    }
  });

  if (!session) {
    notFound();
  }

  const answeredIds = session.answers.map((answer) => answer.questionId);
  const nextQuestion = await prisma.question.findFirst({
    where: {
      section: session.section ?? undefined,
      domain: session.domain ?? undefined,
      difficulty: session.difficulty ?? undefined,
      answers: {
        none: {
          sessionId: session.id
        }
      }
    },
    include: {
      choices: {
        orderBy: { sortOrder: "asc" }
      }
    }
  });

  if (!nextQuestion || session.completedAt) {
    return (
      <div className="panel" style={{ maxWidth: "48rem", margin: "0 auto" }}>
        <p className="muted">Session complete</p>
        <h1>
          {session.correctAnswers} / {session.totalQuestions} correct
        </h1>
        <p className="muted">
          Completed {formatSection(session.section ?? "READING_WRITING")} set with {answeredIds.length} answered
          questions.
        </p>
      </div>
    );
  }

  return (
    <div className="panel" style={{ maxWidth: "52rem", margin: "0 auto" }}>
      <p className="muted">
        {formatSection(nextQuestion.section)} · {nextQuestion.domain} · {nextQuestion.skill}
      </p>
      <h1 style={{ marginTop: "0.5rem" }}>{nextQuestion.prompt}</h1>
      {nextQuestion.passage ? <p className="muted">{nextQuestion.passage}</p> : null}
      <PracticeQuestionForm
        action={`/api/practice/${session.id}/answer`}
        questionId={nextQuestion.id}
        choices={nextQuestion.choices}
      />
      <p className="muted">
        Answered {session.answers.length} of {session.totalQuestions}
      </p>
    </div>
  );
}
