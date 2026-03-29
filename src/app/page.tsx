import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const [questionCount, sessionCount, userCount, user] = await Promise.all([
    prisma.question.count(),
    prisma.practiceSession.count(),
    prisma.user.count(),
    getCurrentUser()
  ]);

  const features = [
    {
      icon: "📝",
      title: "Bluebook Exam Mode",
      desc: "Full-length adaptive mock exams that mirror the real digital SAT — timer, flagging, answer elimination, and Module 2 routing."
    },
    {
      icon: "📚",
      title: "Spaced Repetition",
      desc: "Questions you miss are added to a smart review bin powered by the SM-2 algorithm. Your Review Bin resurfaces them at the perfect interval."
    },
    {
      icon: "📊",
      title: "Deep Analytics",
      desc: "Skill mastery bars, weak-area detection, first-try vs. repeat accuracy, time-per-skill breakdowns, and score forecasting."
    },
    {
      icon: "🎯",
      title: "Goal Tracking",
      desc: "Set your target SAT score and test date. See a live countdown and track your daily study streak."
    },
    {
      icon: "👩‍🏫",
      title: "Tutor Dashboards",
      desc: "Tutors get classroom overviews, per-student drill-downs by domain and skill, and can create assignments with due dates."
    },
    {
      icon: "✨",
      title: "AI Explanations",
      desc: "Admins can generate expert step-by-step explanations for any question with one click, powered by Gemini."
    }
  ];

  return (
    <div className="card-grid" style={{ gap: "1.5rem" }}>

      {/* ── Hero ── */}
      <section className="hero-card animate-fade-up">
        <span className="hero-badge">🎓 Official-style SAT practice</span>
        <h1 className="hero-title">
          Score higher.
          <br />
          Practice smarter.
        </h1>
        <p className="hero-copy">
          A full SAT prep platform with Bluebook-style mock exams, adaptive difficulty, spaced repetition, and analytics that actually tell you what to work on.
        </p>
        <div className="hero-actions">
          {user ? (
            <>
              <Link className="button" href="/practice">Start practicing</Link>
              <Link className="button secondary" href="/exam/new">Take a mock exam</Link>
            </>
          ) : (
            <>
              <Link className="button" href="/register">Get started free</Link>
              <Link className="button secondary" href="/login">Log in</Link>
            </>
          )}
        </div>
      </section>

      {/* ── Live stats ── */}
      <section className="stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="stat" style={{ textAlign: "center" }}>
          <div className="stat-label">Questions loaded</div>
          <div className="stat-value">{questionCount.toLocaleString()}</div>
        </div>
        <div className="stat" style={{ textAlign: "center" }}>
          <div className="stat-label">Practice sessions</div>
          <div className="stat-value">{sessionCount.toLocaleString()}</div>
        </div>
        <div className="stat" style={{ textAlign: "center" }}>
          <div className="stat-label">Active learners</div>
          <div className="stat-value">{userCount.toLocaleString()}</div>
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.15rem", fontWeight: 700 }}>
          Everything you need to hit your target score
        </h2>
        <div className="feature-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <h3 style={{ fontSize: "0.95rem", marginBottom: "0.4rem" }}>{f.title}</h3>
              <p className="muted text-sm" style={{ lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA strip ── */}
      <section
        className="panel"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          background: "#111111",
          borderColor: "#111111"
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#fff", fontSize: "1rem" }}>Ready to move the needle?</h2>
          <p style={{ margin: "0.2rem 0 0", color: "rgba(255,255,255,0.62)", fontSize: "0.875rem" }}>
            Build your first practice set in under 30 seconds.
          </p>
        </div>
        <Link
          className="button"
          href={user ? "/practice" : "/register"}
          style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}
        >
          {user ? "Start a session →" : "Create your account →"}
        </Link>
      </section>
    </div>
  );
}
