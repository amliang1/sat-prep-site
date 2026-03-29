import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function TutorDashboardPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "TUTOR") redirect("/dashboard");

  const classrooms = await prisma.classroom.findMany({
    where: { tutorId: user.id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              answers: { select: { isCorrect: true } },
              sessions: { select: { completedAt: true } }
            }
          }
        }
      },
      assignments: { orderBy: { createdAt: "desc" }, take: 3 }
    }
  });

  function pct(correct: number, total: number) {
    return total ? Math.round((correct / total) * 100) : 0;
  }

  const summaries = classrooms.map((c) => {
    const students = c.members.filter((m) => m.role === "STUDENT");
    const avgAccuracy =
      students.length === 0
        ? 0
        : Math.round(
            students.reduce((sum, m) => {
              const correct = m.user.answers.filter((a) => a.isCorrect).length;
              return sum + pct(correct, m.user.answers.length);
            }, 0) / students.length
          );
    const completedSessions = students.reduce(
      (sum, m) => sum + m.user.sessions.filter((s) => Boolean(s.completedAt)).length,
      0
    );
    return { ...c, studentCount: students.length, avgAccuracy, completedSessions };
  });

  return (
    <div className="card-grid">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <h1 style={{ margin: 0 }}>Tutor dashboard</h1>
        <Link href="/tutor/assignments/new" className="button secondary">
          + New assignment
        </Link>
      </div>

      {summaries.length === 0 ? (
        <div className="panel">
          <p className="muted">You have no classrooms yet. Ask an admin to assign you one.</p>
        </div>
      ) : (
        <div className="card-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          {summaries.map((classroom) => (
            <Link key={classroom.id} href={`/tutor/classrooms/${classroom.id}`} className="panel stat" style={{ display: "block" }}>
              <h2 style={{ margin: "0 0 0.5rem" }}>{classroom.name}</h2>
              <div className="stats" style={{ marginTop: "0.75rem" }}>
                <div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>Students</div>
                  <div style={{ fontWeight: 700, fontSize: "1.4rem" }}>{classroom.studentCount}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>Avg accuracy</div>
                  <div style={{ fontWeight: 700, fontSize: "1.4rem" }}>{classroom.avgAccuracy}%</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>Sessions done</div>
                  <div style={{ fontWeight: 700, fontSize: "1.4rem" }}>{classroom.completedSessions}</div>
                </div>
              </div>
              {classroom.assignments.length > 0 && (
                <div style={{ marginTop: "0.75rem" }}>
                  <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.4rem" }}>Recent assignments</div>
                  {classroom.assignments.map((a) => (
                    <div key={a.id} style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>
                      • {a.name}{a.dueDate ? ` · due ${a.dueDate.toLocaleDateString()}` : ""}
                    </div>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
