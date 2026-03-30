import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildQuestionWhere } from "@/lib/questions";
import { saveSessionQuestionSet } from "@/lib/session-questions";

function shuffle<T>(values: T[]) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const section = String(formData.get("section") || "ALL");
  const domain = String(formData.get("domain") || "");
  const skill = String(formData.get("skill") || "");
  const difficulty = String(formData.get("difficulty") || "ALL");
  const label = String(formData.get("label") || "Focused drill");
  const count = Math.min(20, Math.max(1, Number(formData.get("count") || 6)));

  const questions = await prisma.question.findMany({
    where: buildQuestionWhere({
      section: section === "ALL" ? "ALL" : section as "MATH" | "READING_WRITING",
      domain: domain || undefined,
      difficulty: difficulty === "ALL" ? "ALL" : difficulty as "EASY" | "MEDIUM" | "HARD",
      skill: skill || undefined
    }),
    select: { id: true },
    take: 40
  });

  const questionIds = shuffle(questions.map((question) => question.id)).slice(0, count);

  if (!questionIds.length) {
    return NextResponse.redirect(new URL("/practice?targeted=empty", request.url));
  }

  const session = await prisma.practiceSession.create({
    data: {
      userId: user.id,
      section: section === "ALL" ? null : section,
      domain: domain || null,
      difficulty: difficulty === "ALL" ? null : difficulty,
      totalQuestions: questionIds.length
    }
  });

  await saveSessionQuestionSet({
    userId: user.id,
    sessionId: session.id,
    questionIds,
    source: "TARGETED",
    label
  });

  return NextResponse.redirect(new URL(`/practice/${session.id}`, request.url));
}
