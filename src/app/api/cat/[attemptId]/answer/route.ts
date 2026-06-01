import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { recomputeTheta } from "@/lib/cat";
import { thetaToScaledScore } from "@/lib/irt";
import { addToSrs, advanceSrs } from "@/lib/srs";

type RouteProps = {
  params: Promise<{ attemptId: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const user = await requireUser();
  const { attemptId } = await params;
  const formData = await request.formData();
  const questionId = String(formData.get("questionId"));
  const choiceId = formData.get("choiceId") ? String(formData.get("choiceId")) : null;
  const renderedAtMs = Number(formData.get("renderedAtMs") || 0);

  const [attempt, question] = await Promise.all([
    prisma.adaptiveAttempt.findFirst({
      where: { id: attemptId, userId: user.id }
    }),
    prisma.question.findUnique({
      where: { id: questionId }
    })
  ]);

  if (!attempt || !question || attempt.completedAt) {
    return NextResponse.redirect(new URL("/practice", request.url));
  }

  const existing = await prisma.adaptiveResponse.findUnique({
    where: { attemptId_questionId: { attemptId: attempt.id, questionId: question.id } }
  });
  if (existing) {
    return NextResponse.redirect(new URL(`/cat/${attempt.id}`, request.url));
  }

  const isCorrect = question.correctChoiceId === choiceId;
  const position =
    (await prisma.adaptiveResponse.count({ where: { attemptId: attempt.id } })) + 1;
  const responseMs = renderedAtMs ? Math.max(0, Date.now() - renderedAtMs) : null;

  // Persist the response with a placeholder theta first…
  await prisma.adaptiveResponse.create({
    data: {
      attemptId: attempt.id,
      questionId: question.id,
      position,
      isCorrect,
      thetaAfter: attempt.theta,
      thetaSeAfter: attempt.thetaSe,
      responseMs
    }
  });

  // …then recompute θ from the full set of responses and snapshot it.
  const { theta, se } = await recomputeTheta(attempt.id);

  await prisma.$transaction([
    prisma.adaptiveResponse.update({
      where: { attemptId_questionId: { attemptId: attempt.id, questionId: question.id } },
      data: { thetaAfter: theta, thetaSeAfter: se }
    }),
    prisma.adaptiveAttempt.update({
      where: { id: attempt.id },
      data: { theta, thetaSe: se }
    })
  ]);

  if (isCorrect) {
    await advanceSrs(user.id, question.id);
  } else {
    await addToSrs(user.id, question.id);
  }

  await trackEvent({
    type: "QUESTION_ANSWERED",
    userId: user.id,
    questionId: question.id,
    metadata: {
      kind: "ADAPTIVE",
      attemptId: attempt.id,
      isCorrect,
      position,
      theta,
      thetaSe: se,
      responseMs
    }
  });

  // Auto-finish when stopping rule is met.
  const reachedMax = position >= attempt.maxQuestions;
  const reachedPrecision = se <= attempt.seTarget && position >= 5;
  if (reachedMax || reachedPrecision) {
    await prisma.adaptiveAttempt.update({
      where: { id: attempt.id },
      data: { completedAt: new Date(), scaledScore: thetaToScaledScore(theta) }
    });
    await trackEvent({
      type: "SESSION_COMPLETED",
      userId: user.id,
      metadata: {
        kind: "ADAPTIVE",
        attemptId: attempt.id,
        theta,
        thetaSe: se,
        scaledScore: thetaToScaledScore(theta),
        questions: position,
        reason: reachedMax ? "MAX_QUESTIONS" : "PRECISION"
      }
    });
  }

  return NextResponse.redirect(new URL(`/cat/${attempt.id}`, request.url));
}
