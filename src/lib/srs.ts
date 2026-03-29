/**
 * SM-2 Spaced Repetition Algorithm
 * Updates interval and easeFactor based on answer quality (0-5).
 * Quality >= 3 means correct; quality < 3 means incorrect (reset).
 */
export function sm2(
  interval: number,
  easeFactor: number,
  quality: number // 0=wrong, 3=hard-correct, 4=correct, 5=easy
): { nextInterval: number; nextEaseFactor: number; nextReviewDate: Date } {
  // Clamp quality to [0,5]
  const q = Math.max(0, Math.min(5, quality));

  let nextEaseFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (nextEaseFactor < 1.3) nextEaseFactor = 1.3;

  let nextInterval: number;
  if (q < 3) {
    nextInterval = 1; // reset
  } else if (interval === 0) {
    nextInterval = 1;
  } else if (interval === 1) {
    nextInterval = 6;
  } else {
    nextInterval = Math.round(interval * nextEaseFactor);
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

  return { nextInterval, nextEaseFactor, nextReviewDate };
}

/** Add a wrong answer to the SRS review bin (upsert). */
import { prisma } from "@/lib/prisma";

export async function addToSrs(userId: string, questionId: string) {
  const existing = await prisma.srsItem.findUnique({
    where: { userId_questionId: { userId, questionId } }
  });

  if (existing) {
    // Wrong again – apply SM-2 with quality=0
    const { nextInterval, nextEaseFactor, nextReviewDate } = sm2(
      existing.interval,
      existing.easeFactor,
      0
    );
    await prisma.srsItem.update({
      where: { userId_questionId: { userId, questionId } },
      data: { interval: nextInterval, easeFactor: nextEaseFactor, nextReviewDate }
    });
  } else {
    await prisma.srsItem.create({
      data: { userId, questionId, interval: 0, easeFactor: 2.5, nextReviewDate: new Date() }
    });
  }
}

/** Mark a review-bin question as correctly answered and advance the interval. */
export async function advanceSrs(userId: string, questionId: string) {
  const existing = await prisma.srsItem.findUnique({
    where: { userId_questionId: { userId, questionId } }
  });
  if (!existing) return;

  const { nextInterval, nextEaseFactor, nextReviewDate } = sm2(
    existing.interval,
    existing.easeFactor,
    4
  );
  await prisma.srsItem.update({
    where: { userId_questionId: { userId, questionId } },
    data: { interval: nextInterval, easeFactor: nextEaseFactor, nextReviewDate }
  });
}

/** Return questions due for review today for a user. */
export async function getDueSrsItems(userId: string) {
  return prisma.srsItem.findMany({
    where: { userId, nextReviewDate: { lte: new Date() } },
    include: { question: { include: { choices: { orderBy: { sortOrder: "asc" } } } } },
    orderBy: { nextReviewDate: "asc" }
  });
}
