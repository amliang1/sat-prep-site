import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminImportPage() {
  await requireAdmin();
  const questionCount = await prisma.question.count();

  return (
    <div className="card-grid">
      <section className="panel">
        <p className="muted">Admin ingestion</p>
        <h1 style={{ marginTop: "0.5rem" }}>Import public College Board questions</h1>
        <p className="muted">
          The importer is configured for public SAT question-bank material. It avoids bundling a copyrighted corpus
          into the repo and instead pulls official released questions on demand.
        </p>
        <p>Current stored questions: {questionCount}</p>
        <form className="form-grid" action="/api/admin/import" method="post" style={{ maxWidth: "20rem" }}>
          <label className="field">
            <span>Import limit</span>
            <input type="number" name="limit" min="1" max="200" defaultValue="40" />
          </label>
          <button className="button" type="submit">
            Run importer
          </button>
        </form>
      </section>
    </div>
  );
}
