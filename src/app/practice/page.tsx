import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getQuestionFilters } from "@/lib/questions";
import { prisma } from "@/lib/prisma";
import { getDueSrsItems } from "@/lib/srs";
import { getDashboardAnalytics } from "@/lib/dashboard";
import { FileText, Library, ArrowRight, Baseline, Triangle, Circle, Check } from "lucide-react";

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
  const [{ domains }, recentSessions, dueCount, analytics] = await Promise.all([
    getQuestionFilters(),
    prisma.practiceSession.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 6
    }),
    getDueSrsItems(user.id).then((items) => items.length),
    getDashboardAnalytics(user.id, user.role)
  ]);
  const weakestSkill = analytics.weakAreas[0];

  return (
    <div className="card-grid" style={{ gap: "1.5rem" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Practice</h1>
          <p className="muted text-sm" style={{ marginTop: "0.25rem" }}>
            Build a focused set, or take a full Bluebook-style mock exam.
          </p>
        </div>
        <Link href="/exam/new" className="button" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          <FileText size={18} />
          Mock exam
        </Link>
      </div>

        <div className="panel review-bin-cta" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Library size={24} style={{ color: "var(--amber)" }} />
            <div>
              <strong>Review Bin — {dueCount} question{dueCount !== 1 ? "s" : ""} due</strong>
              <p className="muted text-sm" style={{ margin: "0.2rem 0 0" }}>
                Spaced repetition: hit these before starting fresh practice.
              </p>
            </div>
          </div>
          <form action="/api/practice/srs-session" method="post">
            <button className="button" type="submit" style={{ background: "var(--amber)", border: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              Start review
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

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
            <button className="button" type="submit" style={{ marginTop: "0.25rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              Start session
              <ArrowRight size={16} />
            </button>
          </form>
        </section>

        {/* ── Quick-start cards ── */}
        <section className="panel">
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Quick start</h2>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {[
              { icon: <Baseline size={18} />, label: "Reading & Writing", section: "READING_WRITING", difficulty: "ALL", count: 10 },
              { icon: <Triangle size={18} />, label: "Math — Mixed", section: "MATH", difficulty: "ALL", count: 10 },
              { icon: <Circle size={18} fill="var(--red)" color="var(--red)" />, label: "Hard questions only", section: "READING_WRITING", difficulty: "HARD", count: 8 },
              { icon: <Circle size={18} fill="var(--green)" color="var(--green)" />, label: "Confidence builder", section: "READING_WRITING", difficulty: "EASY", count: 10 }
            ].map((preset) => (
              <form key={preset.label} action="/api/practice/start" method="post">
                <input type="hidden" name="section" value={preset.section} />
                <input type="hidden" name="difficulty" value={preset.difficulty} />
                <input type="hidden" name="count" value={String(preset.count)} />
                <button
                  type="submit"
                  className="quick-start-card"
                >
                  <span style={{ display: "flex", alignItems: "center" }}>{preset.icon}</span>
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

      {weakestSkill && (
        <section className="panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Smart start</h2>
              <p className="muted text-sm" style={{ margin: 0 }}>
                Your weakest tracked skill right now is <strong style={{ color: "var(--text)" }}>{weakestSkill.skill}</strong> at {weakestSkill.accuracy}%.
              </p>
            </div>
            <form action="/api/practice/targeted-session" method="post">
              <input type="hidden" name="skill" value={weakestSkill.skill} />
              <input type="hidden" name="count" value="6" />
              <input type="hidden" name="label" value={`Smart start: ${weakestSkill.skill}`} />
              <button className="button" type="submit">
                Drill weakest skill
              </button>
            </form>
          </div>
        </section>
      )}

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
                    <span className="badge badge-easy" style={{ marginTop: "0.5rem", fontSize: "0.68rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                      <Check size={12} />
                      Complete
                    </span>
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
