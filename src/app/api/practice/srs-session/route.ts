import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDueSrsItems } from "@/lib/srs";
import { prisma } from "@/lib/prisma";
import { saveSessionQuestionSet } from "@/lib/session-questions";

/**
 * POST /api/practice/srs-session
 * Creates a new PracticeSession loaded with today's SRS-due questions.
 */
export async function POST(request: Request) {
  const user = await requireUser();
  const dueItems = await getDueSrsItems(user.id);

  if (!dueItems.length) {
    // Nothing to review – redirect back to practice hub
    return NextResponse.redirect(new URL("/practice?srs=empty", request.url));
  }

  const questionIds = dueItems.map((item) => item.questionId);

  const session = await prisma.practiceSession.create({
    data: {
      userId: user.id,
      section: null,
      domain: null,
      difficulty: null,
      totalQuestions: questionIds.length
    }
  });

  await saveSessionQuestionSet({
    userId: user.id,
    sessionId: session.id,
    questionIds,
    source: "SRS",
    label: "Review Bin"
  });

  return NextResponse.redirect(new URL(`/practice/${session.id}?srs=1`, request.url));
}
