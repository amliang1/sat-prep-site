"use client";

import { useEffect, useState } from "react";

type Choice = {
  id: string;
  label: string;
  text: string;
};

export function PracticeQuestionForm({
  action,
  questionId,
  choices
}: {
  action: string;
  questionId: string;
  choices: Choice[];
}) {
  const [renderedAt, setRenderedAt] = useState("");

  useEffect(() => {
    setRenderedAt(String(Date.now()));
  }, []);

  return (
    <form className="form-grid" action={action} method="post">
      <input name="questionId" type="hidden" value={questionId} />
      <input name="renderedAtMs" type="hidden" value={renderedAt} />
      {choices.map((choice) => (
        <label key={choice.id} className="choice-option">
          <span>
            <input required type="radio" name="choiceId" value={choice.id} style={{ marginRight: "0.75rem" }} />
            <strong>{choice.label}.</strong> {choice.text}
          </span>
        </label>
      ))}
      <button className="button" type="submit">
        Submit answer
      </button>
    </form>
  );
}
