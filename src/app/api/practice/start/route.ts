import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { Difficulty, Section } from "@/lib/constants";
import { buildQuestionWhere } from "@/lib/questions";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const section = String(formData.get("section")) as Section;
  const difficulty = String(formData.get("difficulty") || "ALL") as Difficulty | "ALL";
  const domain = String(formData.get("domain") || "");
  const count = Number(formData.get("count") || 5);

  const totalQuestions = await prisma.question.count({
    where: buildQuestionWhere({
      section,
      difficulty,
      domain
    })
  });

  const session = await prisma.practiceSession.create({
    data: {
      userId: user.id,
      section,
      domain: domain || null,
      difficulty: difficulty === "ALL" ? null : difficulty,
      totalQuestions: Math.min(count, totalQuestions)
    }
  });

  await trackEvent({
    type: "SESSION_STARTED",
    userId: user.id,
    metadata: { sessionId: session.id, section, difficulty, domain, count }
  });

  return NextResponse.redirect(new URL(`/practice/${session.id}`, request.url));
}
