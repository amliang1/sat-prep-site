import { listSkillNodes, SkillNode } from "@/lib/skill-graph";

type MasterySkill = {
  skillId: string;
  label: string;
  section: "MATH" | "READING_WRITING" | null;
  mastery: number;
  attempts: number;
  prerequisites: string[];
  isCanonical: boolean;
};

type Props = {
  snapshot: MasterySkill[];
  masteryThreshold?: number;
};

const DEFAULT_THRESHOLD = 0.85;
const NODE_W = 178;
const NODE_H = 60;
const COL_GAP = 56;
const ROW_GAP = 18;
const PAD_X = 12;
const PAD_Y = 16;

function masteryColor(p: number) {
  if (p >= 0.85) return "var(--green)";
  if (p >= 0.65) return "#84cc16";
  if (p >= 0.45) return "var(--amber)";
  if (p >= 0.25) return "#ea580c";
  return "var(--red)";
}

function masteryBg(p: number) {
  if (p >= 0.85) return "var(--green-soft)";
  if (p >= 0.65) return "#f7fee7";
  if (p >= 0.45) return "var(--amber-soft)";
  if (p >= 0.25) return "#fff7ed";
  return "var(--red-soft)";
}

/**
 * Longest path from a source (no prereqs) → node, computed per section so we
 * get a tidy layered Sugiyama-style layout in O(V+E).  Skills with prereqs
 * outside the section are still placed (treated as roots within that section).
 */
function assignLayers(nodes: SkillNode[]): Map<string, number> {
  const idsInSection = new Set(nodes.map((n) => n.id));
  const layer = new Map<string, number>();
  const visiting = new Set<string>();

  function compute(id: string): number {
    if (layer.has(id)) return layer.get(id)!;
    if (visiting.has(id)) return 0; // cycle guard
    visiting.add(id);

    const node = nodes.find((n) => n.id === id);
    const prereqIds = (node?.prerequisites ?? []).filter((p) => idsInSection.has(p));
    const value = prereqIds.length
      ? 1 + Math.max(...prereqIds.map(compute))
      : 0;

    visiting.delete(id);
    layer.set(id, value);
    return value;
  }

  for (const n of nodes) compute(n.id);
  return layer;
}

function layoutSection(
  sectionNodes: SkillNode[],
  masteryById: Map<string, MasterySkill>
) {
  const layers = assignLayers(sectionNodes);
  const byLayer = new Map<number, SkillNode[]>();
  for (const n of sectionNodes) {
    const l = layers.get(n.id) ?? 0;
    const arr = byLayer.get(l) ?? [];
    arr.push(n);
    byLayer.set(l, arr);
  }

  // Stable sort within each layer: mastered → in-progress → untouched, then label.
  for (const arr of byLayer.values()) {
    arr.sort((a, b) => {
      const ma = masteryById.get(a.id)?.mastery ?? 0;
      const mb = masteryById.get(b.id)?.mastery ?? 0;
      return mb - ma || a.label.localeCompare(b.label);
    });
  }

  const positions = new Map<string, { x: number; y: number }>();
  const sortedLayerKeys = [...byLayer.keys()].sort((a, b) => a - b);
  let width = 0;

  for (const layerKey of sortedLayerKeys) {
    const arr = byLayer.get(layerKey)!;
    const x = PAD_X + layerKey * (NODE_W + COL_GAP);
    arr.forEach((node, idx) => {
      const y = PAD_Y + idx * (NODE_H + ROW_GAP);
      positions.set(node.id, { x, y });
    });
    width = Math.max(width, x + NODE_W);
  }

  const maxRows = Math.max(...[...byLayer.values()].map((a) => a.length));
  const height = PAD_Y * 2 + maxRows * NODE_H + Math.max(0, maxRows - 1) * ROW_GAP;

  return { positions, width: width + PAD_X, height, sectionNodes };
}

function curvePath(x1: number, y1: number, x2: number, y2: number) {
  const mid = (x1 + x2) / 2;
  return `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
}

function SectionGraph({
  title,
  nodes,
  masteryById,
  threshold
}: {
  title: string;
  nodes: SkillNode[];
  masteryById: Map<string, MasterySkill>;
  threshold: number;
}) {
  if (!nodes.length) return null;
  const { positions, width, height } = layoutSection(nodes, masteryById);
  const idSet = new Set(nodes.map((n) => n.id));

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)" }}>
      <div style={{ padding: "0.6rem 0.9rem", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: "0.85rem" }}>
        {title}
      </div>
      <svg width={width} height={height} style={{ display: "block" }}>
        {/* Edges */}
        {nodes.flatMap((node) => {
          const childPos = positions.get(node.id)!;
          return node.prerequisites
            .filter((p) => idSet.has(p))
            .map((p) => {
              const parentPos = positions.get(p)!;
              const x1 = parentPos.x + NODE_W;
              const y1 = parentPos.y + NODE_H / 2;
              const x2 = childPos.x;
              const y2 = childPos.y + NODE_H / 2;
              const parentMastered = (masteryById.get(p)?.mastery ?? 0) >= threshold;
              return (
                <path
                  key={`${p}->${node.id}`}
                  d={curvePath(x1, y1, x2, y2)}
                  fill="none"
                  stroke={parentMastered ? "var(--green)" : "var(--border-strong)"}
                  strokeWidth={parentMastered ? 1.5 : 1}
                  strokeDasharray={parentMastered ? undefined : "3,4"}
                />
              );
            });
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = positions.get(node.id)!;
          const skill = masteryById.get(node.id);
          const mastery = skill?.mastery ?? 0;
          const attempts = skill?.attempts ?? 0;
          const blockedBy = node.prerequisites
            .filter((p) => idSet.has(p))
            .filter((p) => (masteryById.get(p)?.mastery ?? 0) < threshold);
          const isBlocked = blockedBy.length > 0 && mastery < threshold && attempts === 0;

          return (
            <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={8}
                ry={8}
                fill={attempts ? masteryBg(mastery) : "var(--bg)"}
                stroke={attempts ? masteryColor(mastery) : "var(--border)"}
                strokeWidth={1.5}
              />
              <foreignObject x={10} y={6} width={NODE_W - 20} height={NODE_H - 12}>
                <div
                  style={{
                    fontFamily: "inherit",
                    fontSize: "0.74rem",
                    lineHeight: 1.25,
                    color: "var(--text)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                    {node.label}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                    <span style={{ fontWeight: 700, color: attempts ? masteryColor(mastery) : "var(--muted)" }}>
                      {attempts ? `${Math.round(mastery * 100)}%` : "—"}
                    </span>
                    <span style={{ color: "var(--muted)", fontSize: "0.66rem" }}>
                      {isBlocked
                        ? "blocked"
                        : attempts > 0
                          ? `${attempts} tr.`
                          : "ready"}
                    </span>
                  </div>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function MasteryGraph({ snapshot, masteryThreshold = DEFAULT_THRESHOLD }: Props) {
  const masteryById = new Map<string, MasterySkill>(
    snapshot.map((s) => [s.skillId, s])
  );

  const mathNodes = listSkillNodes("MATH");
  const rwNodes = listSkillNodes("READING_WRITING");
  const orphanSkills = snapshot.filter((s) => !s.isCanonical && s.attempts > 0);

  const masteredCount = snapshot.filter((s) => s.mastery >= masteryThreshold).length;
  const totalKnown = snapshot.filter((s) => s.attempts > 0).length;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <p className="muted text-xs" style={{ margin: 0 }}>
          Each node is a skill; an edge means the source is a prerequisite. Mastery is P(skill mastered) from a Bayesian Knowledge Tracing update on every answer. Solid green edges = prereq already mastered; dashed = still needed.
        </p>
        <span className="badge" style={{ fontSize: "0.72rem" }}>
          {masteredCount} / {totalKnown} skills past {Math.round(masteryThreshold * 100)}%
        </span>
      </div>

      <SectionGraph title="Math" nodes={mathNodes} masteryById={masteryById} threshold={masteryThreshold} />
      <SectionGraph title="Reading & Writing" nodes={rwNodes} masteryById={masteryById} threshold={masteryThreshold} />

      {orphanSkills.length > 0 && (
        <div className="panel-inset" style={{ padding: "0.6rem 0.85rem" }}>
          <div className="muted text-xs" style={{ marginBottom: "0.45rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Tracked but outside the prerequisite graph
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {orphanSkills.map((s) => (
              <span
                key={s.skillId}
                className="badge"
                style={{
                  background: masteryBg(s.mastery),
                  color: masteryColor(s.mastery),
                  border: `1px solid ${masteryColor(s.mastery)}`,
                  fontSize: "0.72rem"
                }}
              >
                {s.label} · {Math.round(s.mastery * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
