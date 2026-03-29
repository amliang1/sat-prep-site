import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

type Props = { params: Promise<{ classroomId: string }> };

export default async function ClassroomPage({ params }: Props) {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "TUTOR") redirect("/dashboard");
  const { classroomId } = await params;

  const classroom = await prisma.classroom.findFirst({
    where: { id: classroomId, tutorId: user.id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              answers: {
                include: { question: { select: { skill: true, domain: true, difficulty: true } } }
              },
              sessions: true
            }
          }
        }
      },
      assignments: { orderBy: { dueDate: "asc" } }
    }
  });

  if (!classroom) notFound();

  function pct(c: number, t: number) { return t ? Math.round((c / t) * 100) : 0; }

  const students = classroom.members
    .filter((m) => m.role === "STUDENT")
    .map((m) => {
      const correct = m.user.answers.filter((a) => a.isCorrect).length;
      const weakDomains = Object.entries(
        m.user.answers.reduce<Record<string, { c: number; t: number }>>((acc, a) => {
          const key = a.question.domain;
          const cur = acc[key] ?? { c: 0, t: 0 };
          cur.t++;
          if (a.isCorrect) cur.c++;
          acc[key] = cur;
          return acc;
        }, {})
      )
        .map(([domain, s]) => ({ domain, accuracy: pct(s.c, s.t) }))
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 2);
      return {
        ...m.user,
        accuracy: pct(correct, m.user.answers.length),
        totalAnswers: m.user.answers.length,
        sessionsCompleted: m.user.sessions.filter((s) => Boolean(s.completedAt)).length,
        weakDomains
      };
    });

  return (
    <div className="card-grid">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p className="muted" style={{ margin: "0 0 0.25rem" }}>
            <Link href="/tutor">← Tutor dashboard</Link>
          </p>
          <h1 style={{ margin: 0 }}>{classroom.name}</h1>
        </div>
        <Link href={`/tutor/assignments/new?classroomId=${classroomId}`} className="button secondary">
          + Add assignment
        </Link>
      </div>

      {/* Assignments */}
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Assignments ({classroom.assignments.length})</h2>
        {classroom.assignments.length === 0 ? (
          <p className="muted">No assignments yet.</p>
        ) : (
          <div className="card-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {classroom.assignments.map((a) => (
              <div key={a.id} className="stat">
                <strong>{a.name}</strong>
                {a.description && <p className="muted" style={{ margin: "0.3rem 0 0", fontSize: "0.9rem" }}>{a.description}</p>}
                {a.dueDate && <p className="muted" style={{ margin: "0.3rem 0 0", fontSize: "0.8rem" }}>Due: {a.dueDate.toLocaleDateString()}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Students */}
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Students ({students.length})</h2>
        <div className="card-grid">
          {students.length === 0 ? (
            <p className="muted">No students enrolled.</p>
          ) : (
            students.map((s) => (
              <Link key={s.id} href={`/tutor/students/${s.id}`} className="stat" style={{ display: "block" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                  <strong>{s.name}</strong>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>{s.email}</span>
                </div>
                <div className="stats" style={{ marginTop: "0.5rem" }}>
                  <div>
                    <div className="muted" style={{ fontSize: "0.75rem" }}>Accuracy</div>
                    <div style={{ fontWeight: 700 }}>{s.accuracy}%</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: "0.75rem" }}>Answers</div>
                    <div style={{ fontWeight: 700 }}>{s.totalAnswers}</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: "0.75rem" }}>Sessions</div>
                    <div style={{ fontWeight: 700 }}>{s.sessionsCompleted}</div>
                  </div>
                </div>
                {s.weakDomains.length > 0 && (
                  <div style={{ marginTop: "0.4rem" }}>
                    <span className="muted" style={{ fontSize: "0.75rem" }}>Weakest: </span>
                    {s.weakDomains.map((d) => (
                      <span key={d.domain} className="tag-chip" style={{ fontSize: "0.75rem", marginRight: "0.35rem" }}>
                        {d.domain} {d.accuracy}%
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
