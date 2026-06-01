import { Question } from "@prisma/client";
import { IrtItem } from "@/lib/irt";

const DEFAULT_DISCRIMINATION = 1.0;

const DIFFICULTY_TO_B: Record<string, number> = {
  EASY: -1.0,
  MEDIUM: 0.0,
  HARD: 1.0
};

type CalibratableQuestion = Pick<
  Question,
  "id" | "difficulty" | "irtDifficulty" | "irtDiscrimination"
>;

/**
 * Resolve IRT parameters for a question.  Uses the calibrated values when
 * available, otherwise falls back to the categorical difficulty bucket.
 */
export function questionToIrtItem(question: CalibratableQuestion): IrtItem {
  const b =
    question.irtDifficulty ??
    DIFFICULTY_TO_B[question.difficulty] ??
    0;
  const a = question.irtDiscrimination ?? DEFAULT_DISCRIMINATION;
  return { id: question.id, a, b };
}
