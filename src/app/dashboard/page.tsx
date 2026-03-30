import { requireUser } from "@/lib/auth";
import { getDashboardAnalytics } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";
import { getDueSrsItems } from "@/lib/srs";
import { ScoreChart } from "@/components/score-chart";
import Link from "next/link";
import { formatSection } from "@/lib/utils";

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const diff = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function heatmapColor(accuracy: number): string {
  if (accuracy >= 85) return "var(--green)";
  if (accuracy >= 70) return "#84cc16";
  if (accuracy >= 55) return "var(--amber)";
  if (accuracy >= 40) return "#ea580c";
  return "var(--red)";
}

function heatmapBg(accuracy: number): string {
  if (accuracy >= 85) return "var(--green-soft)";
  if (accuracy >= 70) return "#f7fee7";
  if (accuracy >= 55) return "var(--amber-soft)";
  if (accuracy >= 40) return "#fff7ed";
  return "var(--red-soft)";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [analytics, fullUser, dueSrsItems, examAttempts] = await Promise.all([
    getDashboardAnalytics(user.id, user.role),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { targetScore: true, testDate: true, currentStreak: true }
    }),
    getDueSrsItems(user.id),
    prisma.mockExamAttempt.findMany({
      where: { userId: user.id, score: { not: null }, completedAt: { not: null } },
      orderBy: { completedAt: "asc" },
      take: 12,
      select: { score: true, completedAt: true, id: true }
    })
  ]);

  const testDaysRemaining = daysUntil(fullUser?.testDate ?? null);
  const latestExamScore = examAttempts.at(-1)?.score ?? null;
  const estimatedCurrentScore =
    latestExamScore ?? Math.round((400 + (analytics.overallAccuracy / 100) * 1200) / 10) * 10;
  const targetScore = fullUser?.targetScore ?? null;
  const scoreGap = targetScore ? Math.max(0, targetScore - estimatedCurrentScore) : null;
  const urgencyBoost = testDaysRemaining === null ? 0 : testDaysRemaining <= 30 ? 2 : testDaysRemaining <= 60 ? 1 : 0;
  const gapBoost = scoreGap === null ? 0 : scoreGap >= 150 ? 2 : scoreGap >= 70 ? 1 : 0;
  const sessionsPerWeek = clamp(3 + urgencyBoost + gapBoost, 2, 7);
  const weakerSection = [...analytics.sectionAccuracy]
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)[0];
  const primaryFocus = analytics.weakAreas.slice(0, 3);
  const planHeadline = targetScore && testDaysRemaining !== null
    ? `${sessionsPerWeek} focused sessions/week to stay on pace for ${targetScore}`
    : `${sessionsPerWeek} focused sessions/week to build steady momentum`;

  const chartPoints = examAttempts
    .filter((a) => a.score !== null && a.completedAt !== null)
    .map((a) => ({
      score: a.score!,
      label: new Date(a.completedAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }));

  return (
    <div className="card-grid" style={{ gap: "1.25rem" }}>

      {/* ── Goal / streak bar ── */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1px", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", background: "var(--border)" }}>
        <div style={{ background: "var(--surface)", padding: "1rem 1.25rem" }}>
          <div className="stat-label">Day streak</div>
          <div className="stat-value">{fullUser?.currentStreak ?? 0} 🔥</div>
        </div>
        {fullUser?.targetScore ? (
          <div style={{ background: "var(--surface)", padding: "1rem 1.25rem" }}>
            <div className="stat-label">Target score</div>
            <div className="stat-value">{fullUser.targetScore}</div>
          </div>
        ) : null}
        {testDaysRemaining !== null ? (
          <div style={{ background: "var(--surface)", padding: "1rem 1.25rem" }}>
            <div className="stat-label">Days until test</div>
            <div className="stat-value">{testDaysRemaining}</div>
          </div>
        ) : null}
        <div style={{ background: "var(--surface)", padding: "1rem 1.25rem" }}>
          <div className="stat-label">Lifetime accuracy</div>
          <div className="stat-value">{analytics.overallAccuracy}%</div>
        </div>
        <div style={{ background: "var(--surface)", padding: "1rem 1.25rem" }}>
          <div className="stat-label">Sessions done</div>
          <div className="stat-value">{analytics.sessionsCompleted}</div>
        </div>
        <div style={{ background: "var(--surface)", padding: "1rem 1.25rem" }}>
          <div className="stat-label">Avg time / q</div>
          <div className="stat-value">{analytics.avgResponseSeconds || 0}s</div>
        </div>
      </section>

      {/* ── Review bin ── */}
      {dueSrsItems.length > 0 && (
        <section className="panel review-bin-cta" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <strong>📚 Review Bin — {dueSrsItems.length} question{dueSrsItems.length !== 1 ? "s" : ""} due</strong>
            <p className="muted text-sm" style={{ margin: "0.2rem 0 0" }}>
              Spaced repetition: hit these before starting fresh practice.
            </p>
          </div>
          <form action="/api/practice/srs-session" method="post">
            <button className="button" type="submit" style={{ background: "var(--amber)", borderColor: "var(--amber)", color: "#fff" }}>
              Start review →
            </button>
          </form>
        </section>
      )}

      {/* ── Score trajectory + set goals ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1.25rem", alignItems: "start" }}>
        <section className="panel">
          <h2 style={{ marginTop: 0, fontSize: "1rem", marginBottom: "1rem" }}>Score trajectory</h2>
          <ScoreChart points={chartPoints} />
          {examAttempts.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
              {examAttempts.slice(-3).map((a) => (
                <a
                  key={a.id}
                  href={`/exam/${a.id}/review?module=1`}
                  className="badge"
                  style={{ textDecoration: "none", background: "var(--surface-soft)", border: "1px solid var(--border)", color: "var(--text-light)", fontSize: "0.72rem" }}
                >
                  {new Date(a.completedAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {a.score}
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="panel" style={{ minWidth: 220 }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", marginBottom: "1rem" }}>Study goals</h2>
          <form className="form-grid" action="/api/user/settings" method="post">
            <label className="field">
              <span>Target score</span>
              <input name="targetScore" type="number" min="400" max="1600" step="10"
                placeholder="e.g. 1400" defaultValue={fullUser?.targetScore ?? undefined} />
            </label>
            <label className="field">
              <span>Test date</span>
              <input name="testDate" type="date"
                defaultValue={fullUser?.testDate?.toISOString().slice(0, 10) ?? undefined} />
            </label>
            <button className="button" type="submit" style={{ fontSize: "0.85rem", padding: "8px 16px" }}>
              Save
            </button>
          </form>
        </section>
      </div>

      {/* ── Study plan ── */}
      <section className="panel">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem" }}>Study plan</h2>
            <p className="muted text-sm" style={{ margin: "0.3rem 0 0" }}>
              {planHeadline}
            </p>
          </div>
          <span className="badge" style={{ fontSize: "0.75rem" }}>
            Baseline {estimatedCurrentScore}{latestExamScore ? " from latest mock exam" : " estimated from practice history"}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
          <div className="stat">
            <div className="stat-label">Recommended pace</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{sessionsPerWeek}/week</div>
          </div>
          <div className="stat">
            <div className="stat-label">Priority section</div>
            <div style={{ fontSize: "1.05rem", fontWeight: 800 }}>
              {weakerSection ? formatSection(weakerSection.section) : "Build a baseline"}
            </div>
            {weakerSection && <div className="muted text-xs">{weakerSection.accuracy}% accuracy</div>}
          </div>
          <div className="stat">
            <div className="stat-label">Score gap</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>
              {scoreGap === null ? "Set goal" : scoreGap}
            </div>
            <div className="muted text-xs">
              {targetScore ? `Target ${targetScore}` : "Add a target score for sharper pacing"}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div className="stat">
            <strong style={{ fontSize: "0.9rem" }}>This week</strong>
            <p className="muted text-sm" style={{ margin: "0.35rem 0 0" }}>
              Do {Math.max(1, Math.ceil(sessionsPerWeek / 2))} targeted skill drill{Math.max(1, Math.ceil(sessionsPerWeek / 2)) !== 1 ? "s" : ""}, {Math.max(1, sessionsPerWeek - Math.ceil(sessionsPerWeek / 2))} mixed session{Math.max(1, sessionsPerWeek - Math.ceil(sessionsPerWeek / 2)) !== 1 ? "s" : ""}, and 1 Review Bin pass.
            </p>
          </div>
          <div className="stat">
            <strong style={{ fontSize: "0.9rem" }}>Focus skills</strong>
            {primaryFocus.length ? (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
                {primaryFocus.map((area) => (
                  <form key={area.skill} action="/api/practice/targeted-session" method="post">
                    <input type="hidden" name="skill" value={area.skill} />
                    <input type="hidden" name="count" value="6" />
                    <input type="hidden" name="label" value={`Focused drill: ${area.skill}`} />
                    <button className="button secondary" type="submit" style={{ fontSize: "0.78rem", padding: "0.55rem 0.8rem" }}>
                      {area.skill} · {area.accuracy}%
                    </button>
                  </form>
                ))}
              </div>
            ) : (
              <p className="muted text-sm" style={{ margin: "0.35rem 0 0" }}>
                Complete a few sessions to generate personalized skill drills.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Skill heatmap ── */}
      <section className="panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1rem" }}>Skill mastery heatmap</h2>
          <div style={{ display: "flex", gap: "0.6rem", fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)" }}>
            <span style={{ color: "var(--red)" }}>● &lt;40%</span>
            <span style={{ color: "var(--amber)" }}>● 40–70%</span>
            <span style={{ color: "var(--green)" }}>● 70%+</span>
          </div>
        </div>
        {analytics.skillMastery.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.5rem" }}>
            {analytics.skillMastery.map((skill) => (
              <div
                key={skill.skill}
                style={{
                  background: heatmapBg(skill.accuracy),
                  border: `1px solid ${heatmapColor(skill.accuracy)}`,
                  borderRadius: "var(--radius-sm)",
                  padding: "0.65rem 0.85rem"
                }}
              >
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {skill.skill}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: 800, color: heatmapColor(skill.accuracy) }}>
                    {skill.accuracy}%
                  </span>
                  <span className="muted text-xs">{skill.attempts} tries</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted text-sm">No practice history yet. Start a session to populate the heatmap.</p>
        )}
      </section>

      {/* ── Weak areas + Score trend side by side ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        <section className="panel">
          <h2 style={{ marginTop: 0, fontSize: "1rem", marginBottom: "1rem" }}>Weak areas</h2>
          {analytics.weakAreas.length ? (
            <div style={{ display: "grid", gap: "0.6rem" }}>
              {analytics.weakAreas.map((area) => (
                <div key={area.skill}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{area.skill}</span>
                    <span className="muted text-xs">{area.accuracy}% · {area.attempts} attempts</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${area.accuracy}%`, background: heatmapColor(area.accuracy) }} />
                  </div>
                  <form action="/api/practice/targeted-session" method="post" style={{ marginTop: "0.5rem" }}>
                    <input type="hidden" name="skill" value={area.skill} />
                    <input type="hidden" name="count" value="6" />
                    <input type="hidden" name="label" value={`Focused drill: ${area.skill}`} />
                    <button className="button secondary" type="submit" style={{ fontSize: "0.75rem", padding: "0.45rem 0.7rem" }}>
                      Drill this skill
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted text-sm">Practice a few questions to surface weak areas.</p>
          )}
        </section>

        <section className="panel">
          <h2 style={{ marginTop: 0, fontSize: "1rem", marginBottom: "1rem" }}>Accuracy by difficulty</h2>
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {analytics.accuracyByDifficulty.map((row) => (
              <div key={row.difficulty}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{row.difficulty}</span>
                  <span className="muted text-xs">{row.accuracy}% · {row.attempts} attempts</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${row.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden", background: "var(--border)", marginTop: "1.25rem" }}>
            {[
              { label: "First-try", value: `${analytics.firstTryAccuracy}%` },
              { label: "Repeat", value: `${analytics.repeatAccuracy}%` },
              { label: "Repeats", value: String(analytics.repeatAttempts) }
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "var(--surface)", padding: "0.75rem", textAlign: "center" }}>
                <div className="stat-label">{label}</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Cohort analytics (Tutor/Admin) ── */}
      {analytics.cohortAnalytics.length > 0 && (
        <section className="panel">
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Cohort analytics</h2>
          <div className="card-grid">
            {analytics.cohortAnalytics.map((cohort) => (
              <div key={cohort.id} className="panel">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <strong>{cohort.name}</strong>
                  <span className="muted text-xs">{cohort.studentCount} students · {cohort.avgAccuracy}% avg</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.5rem" }}>
                  {cohort.students.map((student) => (
                    <Link key={student.id} href={`/tutor/students/${student.id}` as any} className="panel" style={{ padding: "0.75rem", display: "block" }}>
                      <strong style={{ fontSize: "0.875rem" }}>{student.name}</strong>
                      <p className="muted text-xs" style={{ margin: "0.2rem 0 0" }}>{student.accuracy}% · {student.sessionsCompleted} sessions</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
