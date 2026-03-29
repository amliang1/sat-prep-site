import { Question } from "@prisma/client";
import { FormattedMathText } from "@/components/formatted-math-text";
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
        <span>{question.questionType === "STUDENT_RESPONSE" ? "Student Response" : "Multiple Choice"}</span>
      </div>
      <div className="question-title">
        <FormattedMathText text={question.prompt} />
      </div>
      {question.passage ? (
        <div className="question-passage">
          <FormattedMathText text={question.passage} />
        </div>
      ) : null}
      {question.questionType === "STUDENT_RESPONSE" ? (
        <div className="choice-item">Free-response question</div>
      ) : (
        <div className="choice-list">
          {question.choices.map((choice) => (
            <div key={choice.id} className="choice-item">
              <span className="choice-label">{choice.label}.</span>
              <FormattedMathText text={choice.text} />
            </div>
          ))}
        </div>
      )}
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
          <FormattedMathText text={question.explanation} />
        </details>
      ) : null}
    </article>
  );
}
