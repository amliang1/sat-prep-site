/**
 * Calibrated section + total score predictor.
 *
 * Method:
 *   1. Per section, take the most recent N = 80 multiple-choice practice
 *      answers and fit θ via 2PL IRT (MAP with N(0,1) prior).  The MAP SE
 *      doubles as a calibrated uncertainty on θ.
 *   2. Map θ → 200–800 (100 points per logit).  Multiply the θ-SE by 100 to
 *      get score-space SE; 80% CI = ±1.282·SE.
 *   3. Blend with the most-recent mock-exam section score using inverse-
 *      variance weighting.  We model the mock-exam observation as N(score, 30²)
 *      — Bluebook-style scoring is well-calibrated and roughly that noisy
 *      within ±2 weeks of a real test.
 *   4. Project to the user's test date by extrapolating the recent
 *      improvement rate (points/week from the last few session scores),
 *      capped so we don't promise 200-point gains in a fortnight.
 *   5. Realistic gain candidates: skills with the largest headroom × IRT
 *      information × pool depth, surfaced as "+X points if you master Y."
 */

import { prisma } from "@/lib/prisma";
import { Section } from "@/lib/constants";
import {
  IrtResponse,
  clampTheta,
  estimateTheta,
  itemInformation,
  thetaToScaledScore
} from "@/lib/irt";
import { questionToIrtItem } from "@/lib/irt-calibration";
import { MASTERY_THRESHOLD } from "@/lib/bkt";
import { resolveSkillNode } from "@/lib/skill-graph";

const RECENT_WINDOW = 80;
const Z_80 = 1.282;
const MOCK_EXAM_SD = 30;
const POINTS_PER_LOGIT = 100;
const MAX_PROJECTED_WEEKLY_GAIN = 25;

export type SectionForecast = {
  section: Section;
  current: number;
  ci: number;
  attemptsUsed: number;
  hasData: boolean;
  weeklyGain: number;
  projected: number | null;
};

export type ScoreForecast = {
  total: { current: number; ci: number; projected: number | null };
  sections: SectionForecast[];
  testDate: Date | null;
  daysToTest: number | null;
  recommendedGains: RealisticGain[];
};

export type RealisticGain = {
  skill: string;
  section: Section;
  currentMastery: number;
  scorePoints: number;
};

async function recentSectionAnswers(userId: string, section: Section) {
  return prisma.practiceAnswer.findMany({
    where: {
      userId,
      question: {
        section,
        questionType: "MULTIPLE_CHOICE",
        correctChoiceId: { not: null }
      }
    },
    orderBy: { answeredAt: "desc" },
    take: RECENT_WINDOW,
    select: {
      isCorrect: true,
      answeredAt: true,
      question: {
        select: {
          id: true,
          difficulty: true,
          irtDifficulty: true,
          irtDiscrimination: true,
          skill: true
        }
      }
    }
  });
}

function blendWithMockExam(
  irtScore: number,
  irtSeScore: number,
  mockScore: number | null,
  daysSinceMock: number | null
) {
  if (mockScore == null || daysSinceMock == null) {
    return { score: irtScore, se: irtSeScore };
  }
  // Decay the mock observation's certainty by ~50% every 21 days.
  const decay = Math.pow(0.5, daysSinceMock / 21);
  const mockVar = (MOCK_EXAM_SD * MOCK_EXAM_SD) / Math.max(0.05, decay);
  const irtVar = Math.max(1, irtSeScore * irtSeScore);
  const w1 = 1 / irtVar;
  const w2 = 1 / mockVar;
  const blended = (w1 * irtScore + w2 * mockScore) / (w1 + w2);
  const blendedVar = 1 / (w1 + w2);
  return { score: blended, se: Math.sqrt(blendedVar) };
}

function snap10(x: number) {
  return Math.round(x / 10) * 10;
}

async function forecastSection(userId: string, section: Section): Promise<SectionForecast> {
  const answers = await recentSectionAnswers(userId, section);
  if (!answers.length) {
    return {
      section,
      current: 500,
      ci: 200,
      attemptsUsed: 0,
      hasData: false,
      weeklyGain: 0,
      projected: null
    };
  }

  const responses: IrtResponse[] = answers.map((a) => ({
    item: questionToIrtItem(a.question),
    correct: a.isCorrect
  }));
  const { theta, se } = estimateTheta(responses);

  const irtScore = thetaToScaledScore(theta);
  const irtSeScore = se * POINTS_PER_LOGIT;

  // Most recent mock exam (any section — we use overall to inform both halves
  // since MockExam doesn't currently track per-section breakdowns).
  const latestMock = await prisma.mockExamAttempt.findFirst({
    where: { userId, score: { not: null }, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    select: { score: true, completedAt: true }
  });
  const mockSectionScore = latestMock?.score != null ? Math.round(latestMock.score / 2) : null;
  const daysSinceMock = latestMock?.completedAt
    ? Math.max(0, (Date.now() - latestMock.completedAt.getTime()) / 86400000)
    : null;

  const blended = blendWithMockExam(irtScore, irtSeScore, mockSectionScore, daysSinceMock);

  // Recent improvement rate: split window into oldest/newest halves and look
  // at the section-score implied by each.
  let weeklyGain = 0;
  if (answers.length >= 30) {
    const mid = Math.floor(answers.length / 2);
    const newer = answers.slice(0, mid);
    const older = answers.slice(mid);
    const newerEst = estimateTheta(
      newer.map((a) => ({ item: questionToIrtItem(a.question), correct: a.isCorrect }))
    );
    const olderEst = estimateTheta(
      older.map((a) => ({ item: questionToIrtItem(a.question), correct: a.isCorrect }))
    );
    const oldestDate = answers[answers.length - 1].answeredAt.getTime();
    const newestDate = answers[0].answeredAt.getTime();
    const weeks = Math.max(0.5, (newestDate - oldestDate) / (7 * 86400000));
    const gainPerWeek =
      ((newerEst.theta - olderEst.theta) * POINTS_PER_LOGIT) / weeks;
    weeklyGain = Math.max(-MAX_PROJECTED_WEEKLY_GAIN, Math.min(MAX_PROJECTED_WEEKLY_GAIN, gainPerWeek));
  }

  return {
    section,
    current: snap10(Math.max(200, Math.min(800, blended.score))),
    ci: Math.round(Math.max(10, Z_80 * blended.se)),
    attemptsUsed: answers.length,
    hasData: true,
    weeklyGain,
    projected: null
  };
}

function projectSection(section: SectionForecast, daysToTest: number | null): number | null {
  if (!section.hasData || daysToTest == null) return null;
  const weeks = daysToTest / 7;
  const raw = section.current + section.weeklyGain * weeks;
  return snap10(Math.max(200, Math.min(800, raw)));
}

async function pickRealisticGains(
  userId: string,
  sectionForecasts: SectionForecast[]
): Promise<RealisticGain[]> {
  const mastery = await prisma.skillMastery.findMany({
    where: { userId, attempts: { gte: 3 } },
    orderBy: { mastery: "asc" }
  });
  if (!mastery.length) return [];

  const sectionByMap = new Map<Section, SectionForecast>();
  for (const f of sectionForecasts) sectionByMap.set(f.section, f);

  // Information-weighted points: a skill that's not yet mastered has the most
  // upside; multiply headroom by the skill's relative coverage of the section.
  const skillCoverage = await prisma.question.groupBy({
    by: ["skill", "section"],
    _count: { _all: true }
  });
  const totalBySection = new Map<string, number>();
  for (const row of skillCoverage) {
    totalBySection.set(row.section, (totalBySection.get(row.section) ?? 0) + row._count._all);
  }
  const coverageBySkill = new Map<string, { section: string; share: number }>();
  for (const row of skillCoverage) {
    const total = totalBySection.get(row.section) ?? 1;
    coverageBySkill.set(row.skill, { section: row.section, share: row._count._all / total });
  }

  const candidates: RealisticGain[] = [];
  for (const row of mastery) {
    if (row.mastery >= MASTERY_THRESHOLD) continue;
    const cov = coverageBySkill.get(row.rawSkill);
    if (!cov) continue;
    const section = cov.section as Section;
    const headroom = MASTERY_THRESHOLD - row.mastery;
    // Cap a single skill's contribution to 80 points so we don't promise
    // moonshots from a single fix.
    const points = Math.min(80, Math.round(headroom * cov.share * POINTS_PER_LOGIT * 2.5));
    if (points < 10) continue;
    const node = resolveSkillNode(row.rawSkill);
    candidates.push({
      skill: node?.label ?? row.rawSkill,
      section,
      currentMastery: row.mastery,
      scorePoints: snap10(points)
    });
  }

  return candidates
    .sort((a, b) => b.scorePoints - a.scorePoints)
    .slice(0, 4);
}

export async function buildScoreForecast(userId: string): Promise<ScoreForecast> {
  const [math, rw, user] = await Promise.all([
    forecastSection(userId, "MATH"),
    forecastSection(userId, "READING_WRITING"),
    prisma.user.findUnique({
      where: { id: userId },
      select: { testDate: true }
    })
  ]);

  const daysToTest = user?.testDate
    ? Math.max(0, Math.ceil((user.testDate.getTime() - Date.now()) / 86400000))
    : null;

  const sections: SectionForecast[] = [
    { ...math, projected: projectSection(math, daysToTest) },
    { ...rw, projected: projectSection(rw, daysToTest) }
  ];

  const total = {
    current: sections.reduce((s, f) => s + f.current, 0),
    ci: Math.round(Math.sqrt(sections.reduce((s, f) => s + f.ci * f.ci, 0))),
    projected:
      daysToTest != null && sections.every((s) => s.projected != null)
        ? sections.reduce((s, f) => s + (f.projected ?? 0), 0)
        : null
  };

  const recommendedGains = await pickRealisticGains(userId, sections);

  return {
    total,
    sections,
    testDate: user?.testDate ?? null,
    daysToTest,
    recommendedGains
  };
}

// Re-export so dashboard glue can import without pulling irt directly.
export { clampTheta, itemInformation };
