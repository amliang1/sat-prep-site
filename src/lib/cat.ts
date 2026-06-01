import { prisma } from "@/lib/prisma";
import { questionToIrtItem } from "@/lib/irt-calibration";
import { IrtItem, estimateTheta, selectNextItem } from "@/lib/irt";

const MULTIPLE_CHOICE_TYPES = ["MULTIPLE_CHOICE"];

/**
 * Pool the candidate items for an adaptive attempt: same section, has a
 * correct choice, and not yet served in this attempt.  Limited to multiple
 * choice so the unified answer endpoint can score automatically.
 */
export async function getCandidateItems(attemptId: string, section: string) {
  const attempt = await prisma.adaptiveAttempt.findUnique({
    where: { id: attemptId },
    select: { responses: { select: { questionId: true } } }
  });
  if (!attempt) return [];

  const usedIds = attempt.responses.map((r) => r.questionId);

  const candidates = await prisma.question.findMany({
    where: {
      section,
      questionType: { in: MULTIPLE_CHOICE_TYPES },
      correctChoiceId: { not: null },
      id: { notIn: usedIds.length ? usedIds : undefined }
    },
    select: {
      id: true,
      difficulty: true,
      irtDifficulty: true,
      irtDiscrimination: true
    }
  });

  return candidates.map(questionToIrtItem);
}

/**
 * Recompute θ and SE from all responses in an attempt.  We re-estimate from
 * scratch each turn so the SE stays consistent with the model.
 */
export async function recomputeTheta(attemptId: string) {
  const responses = await prisma.adaptiveResponse.findMany({
    where: { attemptId },
    include: {
      question: {
        select: {
          id: true,
          difficulty: true,
          irtDifficulty: true,
          irtDiscrimination: true
        }
      }
    },
    orderBy: { position: "asc" }
  });

  const irtResponses = responses.map((response) => ({
    item: questionToIrtItem(response.question),
    correct: response.isCorrect
  }));

  return estimateTheta(irtResponses);
}

export async function pickNextQuestion(attemptId: string, section: string, theta: number) {
  const pool = await getCandidateItems(attemptId, section);
  if (!pool.length) return null;
  const chosen = selectNextItem(theta, pool) as IrtItem;
  return prisma.question.findUnique({
    where: { id: chosen.id },
    include: { choices: { orderBy: { sortOrder: "asc" } } }
  });
}
