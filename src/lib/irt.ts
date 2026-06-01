/**
 * Two-parameter logistic (2PL) item response theory.
 *
 *   P(correct | θ, a, b) = 1 / (1 + exp(-a (θ − b)))
 *
 *   a = discrimination, b = difficulty (both on the logit scale).
 *
 * We estimate θ with maximum a-posteriori (MAP) using a standard normal prior,
 * so the estimate stays well-defined even after only correct or only incorrect
 * responses.  Item information drives next-question selection.
 */

export type IrtItem = {
  id: string;
  a: number;
  b: number;
};

export type IrtResponse = {
  item: IrtItem;
  correct: boolean;
};

const MIN_DISCRIMINATION = 0.3;
const MAX_DISCRIMINATION = 2.5;

export function clampTheta(theta: number) {
  if (!Number.isFinite(theta)) return 0;
  return Math.max(-3.5, Math.min(3.5, theta));
}

function sanitizeItem(item: IrtItem): IrtItem {
  const a = Math.max(MIN_DISCRIMINATION, Math.min(MAX_DISCRIMINATION, item.a || 1));
  const b = Number.isFinite(item.b) ? Math.max(-3, Math.min(3, item.b)) : 0;
  return { id: item.id, a, b };
}

export function probCorrect(theta: number, item: IrtItem) {
  const { a, b } = sanitizeItem(item);
  const z = a * (theta - b);
  // Numerically-stable sigmoid.
  return z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
}

/** Fisher information at θ for a single 2PL item. */
export function itemInformation(theta: number, item: IrtItem) {
  const p = probCorrect(theta, item);
  const { a } = sanitizeItem(item);
  return a * a * p * (1 - p);
}

/**
 * MAP estimate of θ given responses, using a N(0, 1) prior.
 * Solved with a few Newton-Raphson iterations.
 */
export function estimateTheta(responses: IrtResponse[], priorMean = 0, priorSd = 1): {
  theta: number;
  se: number;
} {
  let theta = priorMean;
  const priorVar = priorSd * priorSd;

  for (let iter = 0; iter < 25; iter += 1) {
    let grad = -(theta - priorMean) / priorVar;
    let info = 1 / priorVar;

    for (const { item, correct } of responses) {
      const safe = sanitizeItem(item);
      const p = probCorrect(theta, safe);
      grad += safe.a * ((correct ? 1 : 0) - p);
      info += safe.a * safe.a * p * (1 - p);
    }

    if (info <= 0) break;
    const step = grad / info;
    theta += step;
    theta = clampTheta(theta);
    if (Math.abs(step) < 1e-4) break;
  }

  let info = 1 / priorVar;
  for (const { item } of responses) {
    info += itemInformation(theta, sanitizeItem(item));
  }
  const se = info > 0 ? 1 / Math.sqrt(info) : priorSd;

  return { theta: clampTheta(theta), se };
}

/**
 * Pick the next item maximising Fisher information at the current θ.
 * Items already used in this attempt are filtered out by the caller.
 */
export function selectNextItem(theta: number, pool: IrtItem[]): IrtItem | null {
  if (!pool.length) return null;
  let best = pool[0];
  let bestInfo = itemInformation(theta, best);
  for (let i = 1; i < pool.length; i += 1) {
    const info = itemInformation(theta, pool[i]);
    if (info > bestInfo) {
      best = pool[i];
      bestInfo = info;
    }
  }
  return best;
}

/**
 * Map a θ estimate to a 200–800 SAT-style section score.
 * θ ∈ [-3, 3] → score ∈ [200, 800] with θ=0 mapping to 500.
 */
export function thetaToScaledScore(theta: number): number {
  const clamped = Math.max(-3, Math.min(3, theta));
  const raw = 500 + clamped * 100;
  const rounded = Math.round(raw / 10) * 10;
  return Math.max(200, Math.min(800, rounded));
}
