import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addToSrs } from "@/lib/srs";

type Props = { params: Promise<{ attemptId: string }> };

export async function POST(request: Request, { params }: Props) {
  const user = await requireUser();
  const { attemptId } = await params;
  const body = await request.json();
  const { answers, module: moduleNum, section } = body as {
    answers: Record<string, string>;
    module: number;
    section: string;
  };

  // Verify attempt
  const attempt = await prisma.mockExamAttempt.findFirst({
    where: { id: attemptId, userId: user.id }
  });
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch all answered questions with correct answers
  const questionIds = Object.keys(answers);
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    include: { choices: true }
  });

  let correctCount = 0;
  const totalCount = questions.length;
  const answersDetail: Array<{ questionId: string; givenId: string; isCorrect: boolean }> = [];

  for (const question of questions) {
    const givenAnswer = answers[question.id];
    const isCorrect =
      question.questionType === "STUDENT_RESPONSE"
        ? (question.correctTextAnswer ?? "")
            .split(";")
            .map((v) => v.trim().toLowerCase())
            .includes((givenAnswer ?? "").trim().toLowerCase())
        : question.correctChoiceId === givenAnswer;

    answersDetail.push({ questionId: question.id, givenId: givenAnswer ?? "", isCorrect });

    if (isCorrect) {
      correctCount++;
    } else {
      await addToSrs(user.id, question.id);
    }
  }

  // Log module submission
  await prisma.analyticsEvent.create({
    data: {
      userId: user.id,
      type: "MODULE_SUBMITTED",
      metadata: JSON.stringify({
        attemptId,
        module: moduleNum,
        section,
        correctCount,
        totalCount,
        score: totalCount ? Math.round((correctCount / totalCount) * 100) : 0,
        answersDetail
      })
    }
  });

  // If this was the last module, complete the attempt with scaled score (rough estimate)
  const scaledScore = Math.round(200 + (correctCount / Math.max(totalCount, 1)) * 600);
  await prisma.mockExamAttempt.update({
    where: { id: attemptId },
    data: { completedAt: new Date(), score: scaledScore }
  });

  return NextResponse.json({ correctCount, totalCount, score: scaledScore });
}
