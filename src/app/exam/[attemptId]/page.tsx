import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import BluebookExamClient from "./exam-client";

type Props = {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ module?: string; section?: string; qpm?: string }>;
};

export default async function ExamPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const { attemptId } = await params;
  const { module: moduleStr, section, qpm } = await searchParams;

  const moduleNum = Number(moduleStr ?? "1");
  const currentSection = section ?? "READING_WRITING";
  const questionsPerModule = Number(qpm ?? 10);

  // Verify attempt belongs to user
  const attempt = await prisma.mockExamAttempt.findFirst({
    where: { id: attemptId, userId: user.id }
  });
  if (!attempt) notFound();

  // Pick questions for this module
  // Module 2 = adaptive: use difficulty based on module 1 performance
  let difficulty: string | undefined;
  if (moduleNum === 2) {
    // Count correct answers from module 1 session
    // We piggyback on AnalyticsEvent to find the module 1 session answers
    const mod1Event = await prisma.analyticsEvent.findFirst({
      where: {
        userId: user.id,
        type: "MODULE_SUBMITTED",
        metadata: { contains: `"attemptId":"${attemptId}","module":1` }
      }
    });
    if (mod1Event) {
      const meta = JSON.parse(mod1Event.metadata ?? "{}");
      const score = (meta.correctCount ?? 0) / (meta.totalCount ?? 1);
      difficulty = score >= 0.65 ? "HARD" : "EASY";
    }
  }

  const questions = await prisma.question.findMany({
    where: {
      section: currentSection,
      ...(difficulty ? { difficulty } : {})
    },
    include: { choices: { orderBy: { sortOrder: "asc" } } },
    take: questionsPerModule,
    orderBy: { createdAt: "asc" }
  });

  if (questions.length === 0) {
    return (
      <div className="panel" style={{ maxWidth: "520px", margin: "0 auto", textAlign: "center" }}>
        <h1>No questions available</h1>
        <p className="muted">Import questions first via Admin → Import.</p>
      </div>
    );
  }

  // Time per module (SAT standard, in seconds)
  const timeLimits: Record<string, number> = {
    READING_WRITING: 32 * 60,
    MATH: 35 * 60
  };
  const totalTimeSeconds = Math.round(
    (timeLimits[currentSection] ?? 1920) * (questionsPerModule / 27)
  );

  return (
    <BluebookExamClient
      attemptId={attemptId}
      questions={questions}
      module={moduleNum}
      section={currentSection}
      totalTimeSeconds={totalTimeSeconds}
    />
  );
}
