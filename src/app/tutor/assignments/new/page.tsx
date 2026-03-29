import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

type Props = { searchParams: Promise<{ classroomId?: string }> };

export default async function NewAssignmentPage({ searchParams }: Props) {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "TUTOR") redirect("/dashboard");

  const { classroomId: preselectedClassroomId } = await searchParams;

  const classrooms = await prisma.classroom.findMany({
    where: { tutorId: user.id },
    orderBy: { name: "asc" }
  });

  if (classrooms.length === 0) {
    return (
      <div className="panel" style={{ maxWidth: "40rem", margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>New assignment</h1>
        <p className="muted">You have no classrooms to assign work to. Ask an admin to add you to a classroom.</p>
        <Link href="/tutor" className="button secondary">← Back to tutor dashboard</Link>
      </div>
    );
  }

  return (
    <div className="panel" style={{ maxWidth: "40rem", margin: "0 auto" }}>
      <p className="muted" style={{ margin: "0 0 0.5rem" }}>
        <Link href="/tutor">← Tutor dashboard</Link>
      </p>
      <h1 style={{ marginTop: 0 }}>New assignment</h1>
      <form className="form-grid" action="/api/tutor/assignments" method="post">
        <label className="field">
          <span>Classroom</span>
          <select name="classroomId" defaultValue={preselectedClassroomId ?? ""} required>
            {!preselectedClassroomId && <option value="">Select a classroom</option>}
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Assignment name</span>
          <input name="name" type="text" placeholder="e.g. Heart of Algebra practice" required />
        </label>
        <label className="field">
          <span>Description (optional)</span>
          <textarea name="description" rows={3} placeholder="Instructions or context for students…" style={{ borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text)", padding: "0.85rem 1rem", fontFamily: "inherit" }} />
        </label>
        <label className="field">
          <span>Due date (optional)</span>
          <input name="dueDate" type="date" />
        </label>
        <button className="button" type="submit" style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
          Create assignment
        </button>
      </form>
    </div>
  );
}
