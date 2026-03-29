import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

type Props = {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ module?: string; section?: string }>;
};

export default async function ExamResultsPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const { attemptId } = await params;
  const { module: moduleStr, section } = await searchParams;

  const attempt = await prisma.mockExamAttempt.findFirst({
    where: { id: attemptId, userId: user.id },
    include: { exam: true }
  });
  if (!attempt) notFound();

  // Load the module submission event
  const event = await prisma.analyticsEvent.findFirst({
    where: {
      userId: user.id,
      type: "MODULE_SUBMITTED",
      metadata: { contains: `"attemptId":"${attemptId}","module":${moduleStr ?? 1}` }
    }
  });

  const meta = event ? JSON.parse(event.metadata ?? "{}") : {};
  const correctCount = meta.correctCount ?? 0;
  const totalCount = meta.totalCount ?? 0;
  const accuracy = totalCount ? Math.round((correctCount / totalCount) * 100) : 0;
  const scaledSection = Math.round(200 + (correctCount / Math.max(totalCount, 1)) * 600);

  const isModule1 = Number(moduleStr ?? 1) === 1;

  return (
    <div style={{ maxWidth: "620px", margin: "0 auto" }}>
      <div className="panel" style={{ textAlign: "center", padding: "3rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
          {accuracy >= 80 ? "🌟" : accuracy >= 60 ? "👍" : "📚"}
        </div>
        <h1 style={{ margin: "0 0 0.5rem" }}>Module {moduleStr} complete</h1>
        <p className="muted">{section === "READING_WRITING" ? "Reading & Writing" : "Math"}</p>

        <div className="stats" style={{ marginTop: "2rem", justifyContent: "center" }}>
          <div className="stat" style={{ textAlign: "center" }}>
            <div className="muted">Correct</div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{correctCount}/{totalCount}</div>
          </div>
          <div className="stat" style={{ textAlign: "center" }}>
            <div className="muted">Accuracy</div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{accuracy}%</div>
          </div>
          <div className="stat" style={{ textAlign: "center" }}>
            <div className="muted">Est. section score</div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{scaledSection}</div>
          </div>
        </div>

        {isModule1 && (
          <div className="panel" style={{ margin: "2rem 0", background: "var(--surface-soft)", textAlign: "left" }}>
            <strong>Module 2 routing:</strong>
            <p className="muted" style={{ margin: "0.5rem 0 0" }}>
              {accuracy >= 65
                ? "🔥 Great work! You're routed to the Hard Module 2 for a higher score ceiling."
                : "💪 You're routed to the Easy Module 2 to build your score. Focus on fundamentals."}
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", justifyContent: "center", flexWrap: "wrap" }}>
          {isModule1 ? (
            <a
              href={`/exam/${attemptId}?module=2&section=${section ?? "READING_WRITING"}&qpm=${totalCount}`}
              className="button"
              style={{ background: "var(--accent)", color: "#fff", border: "none" }}
            >
              Continue to Module 2 →
            </a>
          ) : (
            <Link
              href="/practice"
              className="button"
              style={{ background: "var(--accent)", color: "#fff", border: "none" }}
            >
              Start another exam
            </Link>
          )}
          <a
            href={`/exam/${attemptId}/review?module=${moduleStr ?? 1}&section=${section ?? "READING_WRITING"}`}
            className="button secondary"
          >
            Review answers
          </a>
          <Link href="/dashboard" className="button ghost">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
