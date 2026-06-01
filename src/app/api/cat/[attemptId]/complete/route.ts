import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { thetaToScaledScore } from "@/lib/irt";

type RouteProps = {
  params: Promise<{ attemptId: string }>;
};

export async function POST(_request: Request, { params }: RouteProps) {
  const user = await requireUser();
  const { attemptId } = await params;

  const attempt = await prisma.adaptiveAttempt.findFirst({
    where: { id: attemptId, userId: user.id }
  });
  if (!attempt) {
    return NextResponse.redirect(new URL("/practice", _request.url));
  }
  if (attempt.completedAt) {
    return NextResponse.redirect(new URL(`/cat/${attempt.id}`, _request.url));
  }

  const scaledScore = thetaToScaledScore(attempt.theta);
  await prisma.adaptiveAttempt.update({
    where: { id: attempt.id },
    data: { completedAt: new Date(), scaledScore }
  });

  const questions = await prisma.adaptiveResponse.count({ where: { attemptId: attempt.id } });

  await trackEvent({
    type: "SESSION_COMPLETED",
    userId: user.id,
    metadata: {
      kind: "ADAPTIVE",
      attemptId: attempt.id,
      theta: attempt.theta,
      thetaSe: attempt.thetaSe,
      scaledScore,
      questions,
      reason: "MANUAL"
    }
  });

  return NextResponse.redirect(new URL(`/cat/${attempt.id}`, _request.url));
}
