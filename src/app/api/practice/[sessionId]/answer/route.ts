import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { addToSrs, advanceSrs } from "@/lib/srs";

type AnswerRouteProps = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: Request, { params }: AnswerRouteProps) {
  const user = await requireUser();
  const { sessionId } = await params;
  const formData = await request.formData();
  const questionId = String(formData.get("questionId"));
  const choiceIdRaw = formData.get("choiceId");
  const choiceId = choiceIdRaw ? String(choiceIdRaw) : null;
  const responseText = String(formData.get("responseText") ?? "").trim();
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

  const normalizedResponse = responseText.replace(/\s+/g, "").toLowerCase();
  const acceptableResponses = (question.correctTextAnswer ?? "")
    .split(";")
    .map((value) => value.trim().replace(/\s+/g, "").toLowerCase())
    .filter(Boolean);
  const isCorrect =
    question.questionType === "STUDENT_RESPONSE"
      ? acceptableResponses.includes(normalizedResponse)
      : question.correctChoiceId === choiceId;

  await prisma.practiceAnswer.create({
    data: {
      sessionId: session.id,
      userId: user.id,
      questionId: question.id,
      selectedChoice: choiceId,
      selectedText: question.questionType === "STUDENT_RESPONSE" ? responseText : null,
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
    metadata: {
      sessionId: session.id,
      isCorrect,
      attemptNumber: priorAttempts + 1,
      renderedAtMs,
      questionType: question.questionType
    }
  });

  if (answerCount >= session.totalQuestions) {
    await trackEvent({
      type: "SESSION_COMPLETED",
      userId: user.id,
      metadata: { sessionId: session.id, correctCount, totalQuestions: session.totalQuestions }
    });
  }

  // Update SRS review bin
  if (!isCorrect) {
    await addToSrs(user.id, question.id);
  } else {
    await advanceSrs(user.id, question.id);
  }

  // Update study streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const userData = await prisma.user.findUnique({ where: { id: user.id }, select: { lastStudyDate: true, currentStreak: true } });
  const lastStudy = userData?.lastStudyDate ? new Date(userData.lastStudyDate) : null;
  if (lastStudy) { lastStudy.setHours(0, 0, 0, 0); }
  const diffDays = lastStudy ? Math.floor((today.getTime() - lastStudy.getTime()) / 86400000) : 999;
  const newStreak = diffDays === 0 ? (userData?.currentStreak ?? 1) : diffDays === 1 ? (userData?.currentStreak ?? 0) + 1 : 1;
  await prisma.user.update({ where: { id: user.id }, data: { lastStudyDate: new Date(), currentStreak: newStreak } });

  return NextResponse.redirect(new URL(`/practice/${session.id}`, request.url));
}
