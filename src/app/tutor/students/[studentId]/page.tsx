import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

type Props = { params: Promise<{ studentId: string }> };

export default async function StudentDrilldownPage({ params }: Props) {
  const tutor = await requireUser();
  if (tutor.role !== "ADMIN" && tutor.role !== "TUTOR") redirect("/dashboard");
  const { studentId } = await params;

  // Ensure the tutor owns a classroom this student belongs to
  const membership = await prisma.classroomMember.findFirst({
    where: {
      userId: studentId,
      classroom: { tutorId: tutor.id }
    }
  });
  if (!membership) notFound();

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      answers: {
        orderBy: { answeredAt: "desc" },
        include: {
          question: {
            select: { id: true, prompt: true, domain: true, skill: true, difficulty: true, section: true }
          }
        }
      },
      sessions: { orderBy: { startedAt: "desc" }, take: 10 }
    }
  });

  if (!student) notFound();

  function pct(c: number, t: number) { return t ? Math.round((c / t) * 100) : 0; }

  const totalCorrect = student.answers.filter((a) => a.isCorrect).length;
  const overallAccuracy = pct(totalCorrect, student.answers.length);

  // Domain breakdown
  const domainMap = student.answers.reduce<Record<string, { c: number; t: number }>>((acc, a) => {
    const key = a.question.domain;
    const cur = acc[key] ?? { c: 0, t: 0 };
    cur.t++;
    if (a.isCorrect) cur.c++;
    acc[key] = cur;
    return acc;
  }, {});

  const domainStats = Object.entries(domainMap)
    .map(([domain, s]) => ({ domain, accuracy: pct(s.c, s.t), attempts: s.t }))
    .sort((a, b) => a.accuracy - b.accuracy);

  // Skill breakdown
  const skillMap = student.answers.reduce<Record<string, { c: number; t: number }>>((acc, a) => {
    const key = a.question.skill;
    const cur = acc[key] ?? { c: 0, t: 0 };
    cur.t++;
    if (a.isCorrect) cur.c++;
    acc[key] = cur;
    return acc;
  }, {});
  const skillStats = Object.entries(skillMap)
    .map(([skill, s]) => ({ skill, accuracy: pct(s.c, s.t), attempts: s.t }))
    .sort((a, b) => a.accuracy - b.accuracy);

  return (
    <div className="card-grid">
      <div>
        <p className="muted" style={{ margin: "0 0 0.25rem" }}>
          <Link href="/tutor">← Tutor dashboard</Link>
        </p>
        <h1 style={{ margin: 0 }}>{student.name}</h1>
        <p className="muted" style={{ marginTop: "0.25rem" }}>{student.email}</p>
      </div>

      {/* Overview stats */}
      <section className="stats">
        <div className="stat">
          <div className="muted">Overall accuracy</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{overallAccuracy}%</div>
        </div>
        <div className="stat">
          <div className="muted">Total answers</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{student.answers.length}</div>
        </div>
        <div className="stat">
          <div className="muted">Sessions completed</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>
            {student.sessions.filter((s) => Boolean(s.completedAt)).length}
          </div>
        </div>
      </section>

      {/* Domain breakdown */}
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Domain breakdown</h2>
        <div className="card-grid">
          {domainStats.map((d) => (
            <div key={d.domain} className="stat">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{d.domain}</strong>
                <span className="muted">{d.accuracy}% · {d.attempts} attempts</span>
              </div>
              <div className="bar-track" style={{ marginTop: "0.5rem" }}>
                <div className="bar-fill" style={{ width: `${d.accuracy}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skill breakdown */}
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Skill breakdown (weakest first)</h2>
        <div className="card-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {skillStats.map((s) => (
            <div key={s.skill} className="stat">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{s.skill}</strong>
                <span className="muted">{s.accuracy}% · {s.attempts} answers</span>
              </div>
              <div className="bar-track" style={{ marginTop: "0.5rem" }}>
                <div className="bar-fill" style={{ width: `${s.accuracy}%`, background: s.accuracy < 50 ? "#ef4444" : "var(--accent)" }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent sessions */}
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Recent sessions</h2>
        <div className="card-grid">
          {student.sessions.length === 0 ? (
            <p className="muted">No sessions yet.</p>
          ) : (
            student.sessions.map((session) => (
              <div key={session.id} className="stat">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{session.section ?? "Mixed"}</strong>
                  <span className="muted">{session.correctAnswers}/{session.totalQuestions} correct</span>
                </div>
                <p className="muted" style={{ margin: "0.3rem 0 0", fontSize: "0.8rem" }}>
                  {session.startedAt.toLocaleDateString()} {session.completedAt ? "· Completed" : "· In progress"}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Recent answer history */}
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Recent answer history</h2>
        <div className="card-grid">
          {student.answers.slice(0, 20).map((a) => (
            <div key={a.id} className="stat" style={{ borderLeft: `3px solid ${a.isCorrect ? "#22c55e" : "#ef4444"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem" }}>{a.question.skill}</span>
                <span className="muted" style={{ fontSize: "0.8rem" }}>{a.question.difficulty}</span>
              </div>
              <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem", color: "var(--text-light)" }}>
                {a.question.prompt.slice(0, 100)}{a.question.prompt.length > 100 ? "…" : ""}
              </p>
              <p className="muted" style={{ margin: "0.3rem 0 0", fontSize: "0.75rem" }}>
                {a.isCorrect ? "✓ Correct" : "✗ Incorrect"} · {a.answeredAt.toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
