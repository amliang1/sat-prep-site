import { Question } from "@prisma/client";
import { formatDifficulty, formatSection } from "@/lib/utils";

type QuestionWithRelations = Question & {
  choices: Array<{ id: string; label: string; text: string }>;
  tags: Array<{ tag: { name: string } }>;
};

export function QuestionCard({ question }: { question: QuestionWithRelations }) {
  return (
    <article className="question-card">
      <div className="question-meta">
        <span>{formatSection(question.section)}</span>
        <span>{formatDifficulty(question.difficulty)}</span>
        <span>{question.domain}</span>
        <span>{question.skill}</span>
      </div>
      <h3 className="question-title">{question.prompt}</h3>
      {question.passage ? <p className="question-passage">{question.passage}</p> : null}
      <div className="choice-list">
        {question.choices.map((choice) => (
          <div key={choice.id} className="choice-item">
            <span className="choice-label">{choice.label}.</span>
            {choice.text}
          </div>
        ))}
      </div>
      <div className="tag-list">
        {question.tags.map(({ tag }) => (
          <span key={tag.name} className="tag-chip">
            {tag.name}
          </span>
        ))}
      </div>
      {question.explanation ? (
        <details className="explanation">
          <summary>Explanation</summary>
          <p>{question.explanation}</p>
        </details>
      ) : null}
    </article>
  );
}
