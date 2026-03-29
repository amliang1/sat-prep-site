import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function NewExamPage() {
  await requireUser();

  // Count available questions per section
  const [rwCount, mathCount] = await Promise.all([
    prisma.question.count({ where: { section: "READING_WRITING" } }),
    prisma.question.count({ where: { section: "MATH" } })
  ]);

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto" }}>
      <div className="panel">
        <h1 style={{ marginTop: 0 }}>📝 Start a Mock Exam</h1>
        <p className="muted">
          Experience the full SAT Bluebook format with strict timing, a flagging tool, and adaptive Module 2 routing.
        </p>

        <div className="card-grid" style={{ margin: "1.5rem 0" }}>
          <div className="stat">
            <strong>Reading & Writing</strong>
            <p className="muted">{rwCount} questions available · 2 modules · 32 min each</p>
          </div>
          <div className="stat">
            <strong>Math</strong>
            <p className="muted">{mathCount} questions available · 2 modules · 35 min each</p>
          </div>
        </div>

        <form action="/api/exam/start" method="post" className="form-grid">
          <label className="field">
            <span>Exam type</span>
            <select name="examType">
              <option value="FULL_LENGTH">Full-length (both sections)</option>
              <option value="READING_WRITING_ONLY">Reading & Writing only</option>
              <option value="MATH_ONLY">Math only</option>
            </select>
          </label>
          <label className="field">
            <span>Questions per module</span>
            <select name="questionsPerModule">
              <option value="10">10 (quick practice)</option>
              <option value="27">27 (full SAT standard)</option>
            </select>
          </label>
          <button
            className="button"
            type="submit"
            disabled={rwCount < 10 && mathCount < 10}
            style={{ background: "var(--accent)", color: "#fff", border: "none", fontSize: "1rem" }}
          >
            Begin exam →
          </button>
          {rwCount < 10 && mathCount < 10 && (
            <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
              Not enough questions imported yet. Go to{" "}
              <Link href="/admin/import" style={{ color: "var(--accent)" }}>Admin → Import</Link> first.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
