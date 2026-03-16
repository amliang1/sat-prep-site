import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";

type AnswerRouteProps = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: Request, { params }: AnswerRouteProps) {
  const user = await requireUser();
  const { sessionId } = await params;
  const formData = await request.formData();
  const questionId = String(formData.get("questionId"));
  const choiceId = String(formData.get("choiceId"));
  const renderedAtMs = Number(formData.get("renderedAtMs") || 0);

  const [session, question] = await Promise.all([
    prisma.practiceSession.findFirst({
      where: { id: sessionId, userId: user.id }
    }),
    prisma.question.findUnique({
      where: { id: questionId }
    })
  ]);

  if (!session || !question) {
    return NextResponse.redirect(new URL("/practice", request.url));
  }

  const priorAttempts = await prisma.practiceAnswer.count({
    where: {
      userId: user.id,
      questionId: question.id
    }
  });

  const isCorrect = question.correctChoiceId === choiceId;
  await prisma.practiceAnswer.create({
    data: {
      sessionId: session.id,
      userId: user.id,
      questionId: question.id,
      selectedChoice: choiceId,
      isCorrect,
      responseTimeMs: renderedAtMs ? Math.max(0, Date.now() - renderedAtMs) : null,
      attemptNumber: priorAttempts + 1
    }
  });

  const answerCount = await prisma.practiceAnswer.count({
    where: { sessionId: session.id }
  });

  const correctCount = await prisma.practiceAnswer.count({
    where: { sessionId: session.id, isCorrect: true }
  });

  await prisma.practiceSession.update({
    where: { id: session.id },
    data: {
      correctAnswers: correctCount,
      completedAt: answerCount >= session.totalQuestions ? new Date() : null
    }
  });

  await trackEvent({
    type: "QUESTION_ANSWERED",
    userId: user.id,
    questionId: question.id,
    metadata: { sessionId: session.id, isCorrect, attemptNumber: priorAttempts + 1, renderedAtMs }
  });

  if (answerCount >= session.totalQuestions) {
    await trackEvent({
      type: "SESSION_COMPLETED",
      userId: user.id,
      metadata: { sessionId: session.id, correctCount, totalQuestions: session.totalQuestions }
    });
  }

  return NextResponse.redirect(new URL(`/practice/${session.id}`, request.url));
}
