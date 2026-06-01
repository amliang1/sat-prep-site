/**
 * SAT skill prerequisite graph.
 *
 * Skills in the question bank are free-text strings, so the graph is
 * intentionally loose: we describe canonical nodes, then map any incoming
 * skill string into a canonical node via a normalisation function.  Skills
 * that don't match any canonical node still get tracked individually — they
 * simply have no prerequisite edges.
 */

import { BktParams, DEFAULT_BKT_PARAMS } from "@/lib/bkt";

export type SkillNode = {
  /** Canonical id, kebab-cased. */
  id: string;
  /** Display label. */
  label: string;
  section: "MATH" | "READING_WRITING";
  /** Direct prerequisite node ids. */
  prerequisites: string[];
  /** Optional per-skill BKT calibration (otherwise DEFAULT_BKT_PARAMS). */
  bkt?: Partial<BktParams>;
};

/* ── Canonical nodes ───────────────────────────────────────────────────── */

export const SKILL_NODES: SkillNode[] = [
  // ── Math: Algebra ──
  { id: "linear-one-var", label: "Linear equations in one variable", section: "MATH", prerequisites: [] },
  { id: "linear-two-var", label: "Linear equations in two variables", section: "MATH", prerequisites: ["linear-one-var"] },
  { id: "systems-linear", label: "Systems of linear equations", section: "MATH", prerequisites: ["linear-two-var"] },
  { id: "linear-inequalities", label: "Linear inequalities", section: "MATH", prerequisites: ["linear-one-var"] },
  { id: "linear-functions", label: "Linear functions", section: "MATH", prerequisites: ["linear-two-var"] },

  // ── Math: Advanced math ──
  { id: "quadratic-functions", label: "Quadratic functions", section: "MATH", prerequisites: ["linear-functions"] },
  { id: "polynomial-functions", label: "Polynomial functions", section: "MATH", prerequisites: ["quadratic-functions"] },
  { id: "exponential-functions", label: "Exponential functions", section: "MATH", prerequisites: ["linear-functions"] },
  { id: "radicals-rationals", label: "Radicals & rational expressions", section: "MATH", prerequisites: ["quadratic-functions"] },
  { id: "nonlinear-systems", label: "Nonlinear systems & equations", section: "MATH", prerequisites: ["systems-linear", "quadratic-functions"] },

  // ── Math: Problem-solving & data analysis ──
  { id: "ratios-rates", label: "Ratios, rates, proportional relationships", section: "MATH", prerequisites: [] },
  { id: "percentages", label: "Percentages", section: "MATH", prerequisites: ["ratios-rates"] },
  { id: "units", label: "Units & conversions", section: "MATH", prerequisites: ["ratios-rates"] },
  { id: "data-interpretation", label: "Data interpretation (tables & graphs)", section: "MATH", prerequisites: [] },
  { id: "stats-spread", label: "Statistics: centre, spread, distribution", section: "MATH", prerequisites: ["data-interpretation"] },
  { id: "probability", label: "Probability", section: "MATH", prerequisites: ["ratios-rates"] },
  { id: "scatterplots", label: "Scatterplots & models", section: "MATH", prerequisites: ["linear-functions", "data-interpretation"] },

  // ── Math: Geometry & trig ──
  { id: "area-volume", label: "Area and volume", section: "MATH", prerequisites: [] },
  { id: "angle-relationships", label: "Angle relationships", section: "MATH", prerequisites: [] },
  { id: "triangles", label: "Triangle properties", section: "MATH", prerequisites: ["angle-relationships"] },
  { id: "right-triangles-trig", label: "Right triangles & trigonometry", section: "MATH", prerequisites: ["triangles"] },
  { id: "circles", label: "Circles", section: "MATH", prerequisites: ["angle-relationships", "area-volume"] },

  // ── R&W: Information & ideas ──
  { id: "words-in-context", label: "Words in context", section: "READING_WRITING", prerequisites: [] },
  { id: "main-purpose", label: "Central ideas & purpose", section: "READING_WRITING", prerequisites: [] },
  { id: "command-of-evidence", label: "Command of evidence", section: "READING_WRITING", prerequisites: ["main-purpose"] },
  { id: "inference", label: "Inference", section: "READING_WRITING", prerequisites: ["main-purpose", "command-of-evidence"] },

  // ── R&W: Craft & structure ──
  { id: "text-structure", label: "Text structure & purpose", section: "READING_WRITING", prerequisites: ["main-purpose"] },
  { id: "cross-text", label: "Cross-text connections", section: "READING_WRITING", prerequisites: ["main-purpose", "inference"] },

  // ── R&W: Expression of ideas ──
  { id: "transitions", label: "Transitions", section: "READING_WRITING", prerequisites: ["text-structure"] },
  { id: "rhetorical-synthesis", label: "Rhetorical synthesis", section: "READING_WRITING", prerequisites: ["transitions"] },

  // ── R&W: Standard English conventions ──
  { id: "subject-verb-agreement", label: "Subject-verb agreement", section: "READING_WRITING", prerequisites: [] },
  { id: "punctuation", label: "Punctuation", section: "READING_WRITING", prerequisites: [] },
  { id: "pronouns", label: "Pronouns & antecedents", section: "READING_WRITING", prerequisites: ["subject-verb-agreement"] },
  { id: "modifiers", label: "Modifier placement", section: "READING_WRITING", prerequisites: [] },
  { id: "verb-tense", label: "Verb tense & form", section: "READING_WRITING", prerequisites: ["subject-verb-agreement"] }
];

const SKILL_BY_ID = new Map(SKILL_NODES.map((n) => [n.id, n]));

/* ── Normalisation: free-text skill → canonical id ─────────────────────── */

function strip(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const ALIAS_RULES: Array<[RegExp, string]> = [
  [/\blinear (eq|equations?)\b.*\bone\b/, "linear-one-var"],
  [/\blinear (eq|equations?)\b.*\btwo\b/, "linear-two-var"],
  [/\bsystems? of linear/, "systems-linear"],
  [/\blinear inequal/, "linear-inequalities"],
  [/\blinear functions?\b/, "linear-functions"],
  [/\bquadratic/, "quadratic-functions"],
  [/\bpolynomial/, "polynomial-functions"],
  [/\bexponential/, "exponential-functions"],
  [/\b(radicals?|rational exp)/, "radicals-rationals"],
  [/\bnonlinear/, "nonlinear-systems"],
  [/\bratios?|rates?|proportion/, "ratios-rates"],
  [/\bpercent/, "percentages"],
  [/\bunits?\b|conversion/, "units"],
  [/\bdata (interp|analysis)|tables?|graphs?/, "data-interpretation"],
  [/\bstatistics|mean|median|standard dev|spread|distribution/, "stats-spread"],
  [/\bprobabilit/, "probability"],
  [/\bscatter/, "scatterplots"],
  [/\barea|volume/, "area-volume"],
  [/\bangle/, "angle-relationships"],
  [/\btriangle/, "triangles"],
  [/\bright triangle|trigonomet/, "right-triangles-trig"],
  [/\bcircle/, "circles"],

  [/\bwords?(\s|-)in(\s|-)context\b|\bvocab/, "words-in-context"],
  [/\bcommand of evidence/, "command-of-evidence"],
  [/\binference/, "inference"],
  [/\b(central|main) (idea|purpose)|primary purpose/, "main-purpose"],
  [/\btext structure|structure and purpose/, "text-structure"],
  [/\bcross[\s-]?text|paired passage/, "cross-text"],
  [/\btransitions?\b/, "transitions"],
  [/\brhetorical synth|relevant support/, "rhetorical-synthesis"],
  [/\bsubject[\s-]?verb/, "subject-verb-agreement"],
  [/\bpunctuation\b|comma|semicolon|colon/, "punctuation"],
  [/\bpronouns?\b/, "pronouns"],
  [/\bmodifier/, "modifiers"],
  [/\bverb tense|verb form/, "verb-tense"]
];

export function canonicalSkillId(skill: string): string | null {
  const normalized = strip(skill);
  for (const [pattern, id] of ALIAS_RULES) {
    if (pattern.test(normalized)) return id;
  }
  return null;
}

export function resolveSkillNode(skill: string): SkillNode | null {
  const id = canonicalSkillId(skill);
  return id ? SKILL_BY_ID.get(id) ?? null : null;
}

export function getSkillNode(id: string): SkillNode | undefined {
  return SKILL_BY_ID.get(id);
}

export function listSkillNodes(section?: "MATH" | "READING_WRITING") {
  return section ? SKILL_NODES.filter((n) => n.section === section) : SKILL_NODES.slice();
}

export function skillParams(node: SkillNode | null): BktParams {
  if (!node?.bkt) return DEFAULT_BKT_PARAMS;
  return { ...DEFAULT_BKT_PARAMS, ...node.bkt };
}
