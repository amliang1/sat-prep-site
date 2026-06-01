/**
 * Bayesian Knowledge Tracing (Corbett & Anderson, 1995).
 *
 * Per-skill state is a single number p ∈ [0, 1] — the posterior probability
 * the learner has *mastered* the skill.  After each observed answer (correct
 * or incorrect) we update p with four global per-skill parameters:
 *
 *   pL0  prior probability of mastery before any evidence
 *   pT   probability of transitioning unmastered → mastered after attempting
 *   pS   slip rate (mastered but answered wrong)
 *   pG   guess rate (unmastered but answered right)
 *
 * Update rule:
 *   evidence step:        p' = P(M | obs) using Bayes
 *   transition step:      p_new = p' + (1 - p') * pT
 *
 * This is a pragmatic stand-in for deep knowledge tracing — same per-skill
 * mastery surface, training-free.  The update function is small enough that
 * swapping in a DKT sequence model later is a localised change.
 */

export type BktParams = {
  pL0: number;
  pT: number;
  pS: number;
  pG: number;
};

export const DEFAULT_BKT_PARAMS: BktParams = {
  pL0: 0.25,
  pT: 0.12,
  pS: 0.10,
  pG: 0.20
};

export const MASTERY_THRESHOLD = 0.85;

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function initialMastery(params: BktParams = DEFAULT_BKT_PARAMS): number {
  return clamp01(params.pL0);
}

export function updateMastery(
  priorMastery: number,
  correct: boolean,
  params: BktParams = DEFAULT_BKT_PARAMS
): number {
  const { pS, pG, pT } = params;
  const pPrev = clamp01(priorMastery);

  let posterior: number;
  if (correct) {
    const numer = pPrev * (1 - pS);
    const denom = numer + (1 - pPrev) * pG;
    posterior = denom > 0 ? numer / denom : pPrev;
  } else {
    const numer = pPrev * pS;
    const denom = numer + (1 - pPrev) * (1 - pG);
    posterior = denom > 0 ? numer / denom : pPrev;
  }

  return clamp01(posterior + (1 - posterior) * pT);
}

/**
 * Predicted P(correct) on the next attempt of this skill given current
 * mastery.  Useful for surfacing "ready to advance" cues.
 */
export function predictCorrect(
  mastery: number,
  params: BktParams = DEFAULT_BKT_PARAMS
): number {
  const m = clamp01(mastery);
  return clamp01(m * (1 - params.pS) + (1 - m) * params.pG);
}
