import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getQuestionFilters } from "@/lib/questions";
import { prisma } from "@/lib/prisma";

export default async function PracticePage() {
  const user = await requireUser();
  const [{ domains }, recentSessions] = await Promise.all([
    getQuestionFilters(),
    prisma.practiceSession.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 6
    })
  ]);

  return (
    <div className="card-grid">
      <section className="panel">
        <h1 style={{ marginTop: 0 }}>Build a practice set</h1>
        <form className="form-grid" action="/api/practice/start" method="post">
          <label className="field">
            <span>Section</span>
            <select name="section" defaultValue="READING_WRITING">
              <option value="READING_WRITING">Reading &amp; Writing</option>
              <option value="MATH">Math</option>
            </select>
          </label>
          <label className="field">
            <span>Difficulty</span>
            <select name="difficulty" defaultValue="ALL">
              <option value="ALL">Mixed</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </label>
          <label className="field">
            <span>Domain</span>
            <select name="domain" defaultValue="">
              <option value="">Any domain</option>
              {domains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Question count</span>
            <input defaultValue="5" max="20" min="1" name="count" type="number" />
          </label>
          <button className="button" type="submit">
            Start session
          </button>
        </form>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Recent sessions</h2>
        <div className="card-grid">
          {recentSessions.length ? (
            recentSessions.map((session) => (
              <Link key={session.id} href={`/practice/${session.id}`} className="stat">
                <strong>{session.section === "READING_WRITING" ? "Reading & Writing" : "Math"}</strong>
                <p className="muted">
                  {session.correctAnswers}/{session.totalQuestions} correct
                </p>
              </Link>
            ))
          ) : (
            <div className="muted">No sessions yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
