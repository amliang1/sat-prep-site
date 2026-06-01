import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteProps = {
  params: Promise<{ questionId: string }>;
};

export async function POST(_request: Request, { params }: RouteProps) {
  const user = await requireUser();
  const { questionId } = await params;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      explanation: true,
      aiExplanation: true,
      correctChoiceId: true,
      correctTextAnswer: true,
      choices: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, label: true, text: true }
      }
    }
  });
  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const correctChoice = question.choices.find((c) => c.id === question.correctChoiceId);

  await prisma.socraticConversation.updateMany({
    where: { userId: user.id, questionId: question.id, resolvedAt: null },
    data: { resolvedAt: new Date() }
  });

  return NextResponse.json({
    correctChoice: correctChoice
      ? { label: correctChoice.label, text: correctChoice.text }
      : null,
    correctTextAnswer: question.correctTextAnswer,
    explanation: question.aiExplanation ?? question.explanation ?? null
  });
}
