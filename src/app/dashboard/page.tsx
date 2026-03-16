import { requireUser } from "@/lib/auth";
import { getDashboardAnalytics } from "@/lib/dashboard";

export default async function DashboardPage() {
  const user = await requireUser();
  const analytics = await getDashboardAnalytics(user.id, user.role);

  return (
    <div className="card-grid">
      <section className="stats">
        <div className="stat">
          <div className="muted">Lifetime accuracy</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{analytics.overallAccuracy}%</div>
        </div>
        <div className="stat">
          <div className="muted">Sessions completed</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{analytics.sessionsCompleted}</div>
        </div>
        <div className="stat">
          <div className="muted">Average time per question</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{analytics.avgResponseSeconds || 0}s</div>
        </div>
        <div className="stat">
          <div className="muted">Forecasted next set score</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{analytics.forecastScore}%</div>
        </div>
      </section>

      <section className="panel">
        <h1 style={{ marginTop: 0 }}>Skill mastery chart</h1>
        <div className="card-grid">
          {analytics.skillMastery.length ? (
            analytics.skillMastery.map((skill) => (
              <div key={skill.skill} className="stat">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong>{skill.skill}</strong>
                  <span className="muted">
                    {skill.accuracy}% · {skill.attempts} tries
                  </span>
                </div>
                <div className="bar-track" style={{ marginTop: "0.75rem" }}>
                  <div className="bar-fill" style={{ width: `${skill.accuracy}%` }} />
                </div>
              </div>
            ))
          ) : (
            <div className="muted">No practice history yet.</div>
          )}
        </div>
      </section>

      <section className="card-grid" style={{ gridTemplateColumns: "1.1fr 0.9fr" }}>
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Weak-area detection</h2>
          <div className="card-grid">
            {analytics.weakAreas.length ? (
              analytics.weakAreas.map((area) => (
                <div key={area.skill} className="stat">
                  <strong>{area.skill}</strong>
                  <p className="muted">
                    {area.accuracy}% accuracy across {area.attempts} attempts
                  </p>
                </div>
              ))
            ) : (
              <div className="muted">Practice a few questions to surface weak areas.</div>
            )}
          </div>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Score trend forecast</h2>
          <div className="trend-grid">
            {analytics.recentTrend.length ? (
              analytics.recentTrend.map((score, index) => (
                <div key={`${score}-${index}`} style={{ display: "grid", gap: "0.35rem" }}>
                  <div className="trend-bar" style={{ height: `${Math.max(score, 8)}%` }} />
                  <span className="muted" style={{ fontSize: "0.8rem", textAlign: "center" }}>
                    {score}%
                  </span>
                </div>
              ))
            ) : (
              <div className="muted">Complete at least two sessions to generate a forecast.</div>
            )}
          </div>
          <p className="muted" style={{ marginTop: "1rem" }}>
            Projected next-session score: {analytics.forecastScore}%
          </p>
        </div>
      </section>

      <section className="card-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Accuracy by difficulty</h2>
          <div className="card-grid">
            {analytics.accuracyByDifficulty.map((row) => (
              <div key={row.difficulty} className="stat">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong>{row.difficulty}</strong>
                  <span className="muted">
                    {row.accuracy}% · {row.attempts} attempts
                  </span>
                </div>
                <div className="bar-track" style={{ marginTop: "0.75rem" }}>
                  <div className="bar-fill" style={{ width: `${row.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>First try vs repeat</h2>
          <div className="stats">
            <div className="stat">
              <div className="muted">First-try accuracy</div>
              <div style={{ fontSize: "1.7rem", fontWeight: 700 }}>{analytics.firstTryAccuracy}%</div>
            </div>
            <div className="stat">
              <div className="muted">Repeat accuracy</div>
              <div style={{ fontSize: "1.7rem", fontWeight: 700 }}>{analytics.repeatAccuracy}%</div>
            </div>
            <div className="stat">
              <div className="muted">Repeat attempts</div>
              <div style={{ fontSize: "1.7rem", fontWeight: 700 }}>{analytics.repeatAttempts}</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Time per question</h2>
          <div className="card-grid">
            {analytics.timeBySkill.length ? (
              analytics.timeBySkill.map((item) => (
                <div key={item.skill} className="stat">
                  <strong>{item.skill}</strong>
                  <p className="muted">{item.avgResponseSeconds}s average response time</p>
                </div>
              ))
            ) : (
              <div className="muted">Timing data appears after answering questions in practice mode.</div>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Cohort analytics</h2>
        <div className="card-grid">
          {analytics.cohortAnalytics.length ? (
            analytics.cohortAnalytics.map((cohort) => (
              <div key={cohort.id} className="stat">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
                  <strong>{cohort.name}</strong>
                  <span className="muted">{cohort.studentCount} students</span>
                </div>
                <p className="muted">
                  {cohort.avgAccuracy}% average accuracy · {cohort.avgResponseSeconds || 0}s average response time
                </p>
                <div className="card-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                  {cohort.weakSkills.map((skill) => (
                    <div key={skill.skill} className="panel" style={{ padding: "1rem" }}>
                      <strong>{skill.skill}</strong>
                      <p className="muted">
                        {skill.accuracy}% accuracy across {skill.attempts} attempts
                      </p>
                    </div>
                  ))}
                </div>
                <div className="card-grid" style={{ marginTop: "1rem" }}>
                  {cohort.students.map((student) => (
                    <div key={student.id} className="panel" style={{ padding: "1rem" }}>
                      <strong>{student.name}</strong>
                      <p className="muted">
                        {student.accuracy}% accuracy · {student.avgResponseSeconds || 0}s avg · {student.sessionsCompleted} completed sessions
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="muted">
              No tutor/classroom cohorts yet. Seed a classroom or create cohort management next.
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Analytics included</h2>
        <div className="card-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div className="stat">
            <strong>Skill mastery</strong>
            <p className="muted">Accuracy bars by skill with weak-area detection.</p>
          </div>
          <div className="stat">
            <strong>Timing + difficulty</strong>
            <p className="muted">Average response times and accuracy segmented by difficulty.</p>
          </div>
          <div className="stat">
            <strong>Cohort view</strong>
            <p className="muted">Tutor/admin cohort summaries, weakest shared skills, and per-student snapshots.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
