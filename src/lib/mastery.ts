import { prisma } from "@/lib/prisma";
import { DEFAULT_BKT_PARAMS, initialMastery, updateMastery } from "@/lib/bkt";
import { canonicalSkillId, resolveSkillNode, skillParams } from "@/lib/skill-graph";

/**
 * Slug-ify a free-text skill string so unknown skills still get a stable
 * primary-key-safe id.  Canonical skills keep their canonical id.
 */
function localSkillId(rawSkill: string): string {
  return (
    "raw:" +
    rawSkill
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80)
  );
}

export function skillIdFor(rawSkill: string): string {
  return canonicalSkillId(rawSkill) ?? localSkillId(rawSkill);
}

/**
 * Apply a single BKT observation for a (user, skill).  Called from the answer
 * endpoints; safe to await alongside the rest of the response.
 */
export async function recordSkillObservation(
  userId: string,
  rawSkill: string,
  correct: boolean
) {
  const skillId = skillIdFor(rawSkill);
  const node = resolveSkillNode(rawSkill);
  const params = skillParams(node);

  const existing = await prisma.skillMastery.findUnique({
    where: { userId_skillId: { userId, skillId } }
  });

  const prior = existing?.mastery ?? initialMastery(params);
  const posterior = updateMastery(prior, correct, params);

  await prisma.skillMastery.upsert({
    where: { userId_skillId: { userId, skillId } },
    update: {
      rawSkill,
      mastery: posterior,
      attempts: { increment: 1 },
      correct: { increment: correct ? 1 : 0 },
      lastAnswered: new Date()
    },
    create: {
      userId,
      skillId,
      rawSkill,
      mastery: posterior,
      attempts: 1,
      correct: correct ? 1 : 0
    }
  });
}

/**
 * Snapshot the user's mastery state, joined with the canonical graph so
 * callers can render nodes + prerequisite edges.
 */
export async function getMasterySnapshot(userId: string) {
  const rows = await prisma.skillMastery.findMany({
    where: { userId },
    orderBy: { lastAnswered: "desc" }
  });

  return rows.map((row) => {
    const node = canonicalSkillId(row.rawSkill)
      ? resolveSkillNode(row.rawSkill)
      : null;
    return {
      skillId: row.skillId,
      label: node?.label ?? row.rawSkill,
      section: node?.section ?? null,
      mastery: row.mastery,
      attempts: row.attempts,
      correct: row.correct,
      prerequisites: node?.prerequisites ?? [],
      isCanonical: Boolean(node),
      lastAnswered: row.lastAnswered
    };
  });
}

export const MASTERY_INITIAL = DEFAULT_BKT_PARAMS.pL0;
