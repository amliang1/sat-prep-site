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

      <section className="panel">
        <p className="muted">Admin ingestion</p>
        <h1 style={{ marginTop: "0.5rem" }}>Import local SAT practice PDFs with AI parsing</h1>
        <p className="muted">
          This scans every practice test PDF in <code>sat-practice/</code>, extracts each module, asks Gemini to
          structure the questions, and imports them into the database with answer keys merged afterward.
        </p>
        <p className="muted">
          Requirements: <code>OPENROUTER_API_KEY</code> or <code>GEMINI_API_KEY</code> must be set, and the local
          Python environment must have <code>pypdf</code> available for text extraction.
        </p>
        <form className="form-grid" action="/api/admin/import" method="post" style={{ maxWidth: "24rem" }}>
          <input type="hidden" name="mode" value="local-ai" />
          <button className="button" type="submit">
            Run AI PDF importer
          </button>
        </form>
      </section>
    </div>
  );
}
