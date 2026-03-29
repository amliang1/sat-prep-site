import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const examType = String(formData.get("examType") ?? "FULL_LENGTH");
  const questionsPerModule = Number(formData.get("questionsPerModule") ?? 10);

  // Create mock exam record
  const exam = await prisma.mockExam.create({
    data: { name: `${examType} – ${new Date().toLocaleDateString()}`, type: examType }
  });

  // Create attempt
  const attempt = await prisma.mockExamAttempt.create({
    data: { examId: exam.id, userId: user.id }
  });

  // Pick Module 1 questions for Reading/Writing
  const sections: string[] = [];
  if (examType !== "MATH_ONLY") sections.push("READING_WRITING");
  if (examType !== "READING_WRITING_ONLY") sections.push("MATH");

  // Store config in analytics event for the exam session
  await prisma.analyticsEvent.create({
    data: {
      userId: user.id,
      type: "MOCK_EXAM_STARTED",
      metadata: JSON.stringify({
        attemptId: attempt.id,
        examId: exam.id,
        examType,
        questionsPerModule,
        sections,
        module: 1,
        currentSection: sections[0]
      })
    }
  });

  return NextResponse.redirect(new URL(`/exam/${attempt.id}?module=1&section=${sections[0]}&qpm=${questionsPerModule}`, request.url));
}
