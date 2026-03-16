import { QuestionCard } from "@/components/question-card";
import { Difficulty, Section } from "@/lib/constants";
import { getQuestionFilters, getQuestions } from "@/lib/questions";

type QuestionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
  const params = await searchParams;
  const filters = {
    section: (params.section as Section | "ALL" | undefined) ?? "ALL",
    difficulty: (params.difficulty as Difficulty | "ALL" | undefined) ?? "ALL",
    domain: (params.domain as string | undefined) ?? "",
    tag: (params.tag as string | undefined) ?? "",
    search: (params.search as string | undefined) ?? ""
  };

  const [{ domains, tags }, questions] = await Promise.all([getQuestionFilters(), getQuestions(filters)]);

  return (
    <div className="card-grid">
      <section className="panel">
        <h1 style={{ marginTop: 0 }}>Question bank</h1>
        <form className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <label className="field">
            <span>Section</span>
            <select name="section" defaultValue={filters.section}>
              <option value="ALL">All sections</option>
              <option value="READING_WRITING">Reading &amp; Writing</option>
              <option value="MATH">Math</option>
            </select>
          </label>
          <label className="field">
            <span>Difficulty</span>
            <select name="difficulty" defaultValue={filters.difficulty}>
              <option value="ALL">All difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </label>
          <label className="field">
            <span>Domain</span>
            <select name="domain" defaultValue={filters.domain}>
              <option value="">All domains</option>
              {domains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tag</span>
            <select name="tag" defaultValue={filters.tag}>
              <option value="">All tags</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Search</span>
            <input name="search" defaultValue={filters.search} placeholder="Search prompt, skill, or test name" />
          </label>
          <button className="button" type="submit">
            Apply filters
          </button>
        </form>
      </section>

      <section className="card-grid">
        {questions.length ? (
          questions.map((question) => <QuestionCard key={question.id} question={question} />)
        ) : (
          <div className="panel">No questions match the current filters.</div>
        )}
      </section>
    </div>
  );
}
