import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const [questionCount, sessionCount, userCount] = await Promise.all([
    prisma.question.count(),
    prisma.practiceSession.count(),
    prisma.user.count()
  ]);

  return (
    <div className="card-grid">
      <section className="hero-card">
        <p className="hero-meta">Official SAT practice platform</p>
        <h1 className="hero-title">Practice from released-style material, not generic filler.</h1>
        <p className="hero-copy">
          Browse a categorized question bank, run timed sets by section and domain, track accuracy, and ingest more
          official public questions from College Board sources.
        </p>
        <div className="hero-actions">
          <Link className="button" href="/practice">
            Start Practicing
          </Link>
          <Link className="button secondary" href="/questions">
            Explore Question Bank
          </Link>
        </div>
      </section>

      <section className="stats">
        <div className="stat">
          <div className="muted">Questions loaded</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{questionCount}</div>
        </div>
        <div className="stat">
          <div className="muted">Practice sessions</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{sessionCount}</div>
        </div>
        <div className="stat">
          <div className="muted">Active learners</div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{userCount}</div>
        </div>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>What’s included</h2>
        <div className="feature-grid">
          <div className="stat">
            <strong>Question categorization</strong>
            <p className="muted">Organize by section, domain, skill, difficulty, source, and tags.</p>
          </div>
          <div className="stat">
            <strong>Login + saved progress</strong>
            <p className="muted">Students get account-based history and reusable practice analytics.</p>
          </div>
          <div className="stat">
            <strong>Ingestion workflow</strong>
            <p className="muted">Admin import flow targets publicly available College Board material.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
