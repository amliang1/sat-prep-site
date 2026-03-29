import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getQuestionFilters } from "@/lib/questions";
import { prisma } from "@/lib/prisma";
import { getDueSrsItems } from "@/lib/srs";

function formatSectionLabel(section: string | null) {
  if (section === "READING_WRITING") return "Reading & Writing";
  if (section === "MATH") return "Math";
  return "Mixed";
}

function difficultyColor(pct: number) {
  if (pct >= 75) return "var(--green)";
  if (pct >= 50) return "var(--amber)";
  return "var(--red)";
}

export default async function PracticePage() {
  const user = await requireUser();
  const [{ domains }, recentSessions, dueCount] = await Promise.all([
    getQuestionFilters(),
    prisma.practiceSession.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 6
    }),
    getDueSrsItems(user.id).then((items) => items.length)
  ]);

  return (
    <div className="card-grid" style={{ gap: "1.5rem" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Practice</h1>
          <p className="muted text-sm" style={{ marginTop: "0.25rem" }}>
            Build a focused set, or take a full Bluebook-style mock exam.
          </p>
        </div>
        <Link href="/exam/new" className="button">
          📝 Mock exam
        </Link>
      </div>

      {/* Review bin nudge */}
      {dueCount > 0 && (
        <div className="panel review-bin-cta" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <strong>📚 Review Bin — {dueCount} question{dueCount !== 1 ? "s" : ""} due</strong>
            <p className="muted text-sm" style={{ margin: "0.2rem 0 0" }}>
              Spaced repetition: hit these before starting fresh practice.
            </p>
          </div>
          <form action="/api/practice/srs-session" method="post">
            <button className="button" type="submit" style={{ background: "var(--amber)", border: "none" }}>
              Start review →
            </button>
          </form>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,0.9fr)", gap: "1.25rem", alignItems: "start" }}>

        {/* ── Session builder ── */}
        <section className="panel">
          <h2 style={{ marginTop: 0, marginBottom: "1.25rem" }}>Build a practice set</h2>
          <form className="form-grid" action="/api/practice/start" method="post">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <label className="field">
                <span>Section</span>
                <select name="section" defaultValue="READING_WRITING">
                  <option value="READING_WRITING">Reading & Writing</option>
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
            </div>
            <label className="field">
              <span>Domain</span>
              <select name="domain" defaultValue="">
                <option value="">Any domain</option>
                {domains.map((domain) => (
                  <option key={domain} value={domain}>{domain}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Question count</span>
              <input defaultValue="5" max="20" min="1" name="count" type="number" />
            </label>
            <button className="button" type="submit" style={{ marginTop: "0.25rem" }}>
              Start session →
            </button>
          </form>
        </section>

        {/* ── Quick-start cards ── */}
        <section className="panel">
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Quick start</h2>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {[
              { emoji: "🔤", label: "Reading & Writing", section: "READING_WRITING", difficulty: "ALL", count: 10 },
              { emoji: "📐", label: "Math — Mixed", section: "MATH", difficulty: "ALL", count: 10 },
              { emoji: "🔴", label: "Hard questions only", section: "READING_WRITING", difficulty: "HARD", count: 8 },
              { emoji: "🟢", label: "Confidence builder", section: "READING_WRITING", difficulty: "EASY", count: 10 }
            ].map((preset) => (
              <form key={preset.label} action="/api/practice/start" method="post">
                <input type="hidden" name="section" value={preset.section} />
                <input type="hidden" name="difficulty" value={preset.difficulty} />
                <input type="hidden" name="count" value={String(preset.count)} />
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    background: "var(--surface-soft)",
                    border: "1.5px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.8rem 1rem",
                    cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                    textAlign: "left",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    color: "var(--text)"
                  }}
                  onMouseOver={(e) => { (e.currentTarget.style.borderColor = "var(--border-strong)"); (e.currentTarget.style.background = "var(--accent-soft)"); }}
                  onMouseOut={(e) => { (e.currentTarget.style.borderColor = "var(--border)"); (e.currentTarget.style.background = "var(--surface-soft)"); }}
                >
                  <span>{preset.emoji}</span>
                  <div>
                    <div>{preset.label}</div>
                    <div className="muted text-xs">{preset.count} questions</div>
                  </div>
                </button>
              </form>
            ))}
          </div>
        </section>
      </div>

      {/* ── Recent sessions ── */}
      {recentSessions.length > 0 && (
        <section className="panel">
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Recent sessions</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {recentSessions.map((session) => {
              const pct = session.totalQuestions > 0
                ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
                : 0;
              return (
                <Link
                  key={session.id}
                  href={`/practice/${session.id}`}
                  className="stat"
                  style={{ display: "block", textDecoration: "none" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <strong style={{ fontSize: "0.875rem" }}>
                      {formatSectionLabel(session.section)}
                    </strong>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: difficultyColor(pct) }}>
                      {pct}%
                    </span>
                  </div>
                  <p className="muted text-xs" style={{ margin: "0.25rem 0 0.6rem" }}>
                    {session.correctAnswers}/{session.totalQuestions} correct
                  </p>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${pct}%`, background: difficultyColor(pct) }} />
                  </div>
                  {session.completedAt ? (
                    <span className="badge badge-easy" style={{ marginTop: "0.5rem", fontSize: "0.68rem" }}>✓ Complete</span>
                  ) : (
                    <span className="badge badge-medium" style={{ marginTop: "0.5rem", fontSize: "0.68rem" }}>In progress</span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
