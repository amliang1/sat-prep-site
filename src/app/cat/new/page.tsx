import { requireUser } from "@/lib/auth";
import { Zap, ArrowRight } from "lucide-react";

export default async function NewAdaptivePage() {
  await requireUser();

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
        <Zap size={28} style={{ color: "var(--accent)" }} />
        <h1 style={{ margin: 0 }}>Adaptive diagnostic</h1>
      </div>
      <p className="muted" style={{ marginTop: "0.25rem" }}>
        A computerised adaptive test (CAT) that picks the next question based on the difficulty that gives the most information about your current level. Stops when your score estimate is precise enough — usually 12–20 questions.
      </p>

      <section className="panel" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>Start an attempt</h2>
        <form action="/api/cat/start" method="post" className="form-grid" style={{ display: "grid", gap: "1rem" }}>
          <label className="field">
            <span>Section</span>
            <select name="section" defaultValue="MATH">
              <option value="MATH">Math</option>
              <option value="READING_WRITING">Reading &amp; Writing</option>
            </select>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <label className="field">
              <span>Max questions</span>
              <input name="maxQuestions" type="number" defaultValue="20" min="5" max="40" />
            </label>
            <label className="field">
              <span>Precision target (SE)</span>
              <input name="seTarget" type="number" defaultValue="0.3" min="0.2" max="0.6" step="0.05" />
            </label>
          </div>
          <p className="muted text-xs" style={{ margin: 0 }}>
            Lower SE = tighter score estimate, but takes more questions. 0.3 mirrors typical Bluebook precision.
          </p>
          <button className="button" type="submit" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", width: "fit-content" }}>
            Begin adaptive diagnostic
            <ArrowRight size={16} />
          </button>
        </form>
      </section>
    </div>
  );
}
