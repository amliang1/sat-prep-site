type Point = { label: string; score: number };

export function ScoreChart({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return (
      <p className="muted text-sm" style={{ padding: "1rem 0" }}>
        Complete at least 2 mock exams to see your score trajectory.
      </p>
    );
  }

  const W = 480;
  const H = 160;
  const PAD = { top: 12, right: 16, bottom: 28, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const minScore = 400;
  const maxScore = 1600;

  function xOf(i: number) {
    return PAD.left + (i / (points.length - 1)) * chartW;
  }

  function yOf(score: number) {
    return PAD.top + chartH - ((score - minScore) / (maxScore - minScore)) * chartH;
  }

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(p.score).toFixed(1)}`)
    .join(" ");

  // Y-axis ticks: 400, 800, 1200, 1600
  const yTicks = [400, 800, 1200, 1600];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", maxWidth: W, display: "block" }}
      aria-label="Score trajectory chart"
      role="img"
    >
      {/* Grid lines */}
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yOf(tick)}
            y2={yOf(tick)}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <text
            x={PAD.left - 6}
            y={yOf(tick) + 4}
            textAnchor="end"
            fontSize={10}
            fill="var(--muted)"
          >
            {tick}
          </text>
        </g>
      ))}

      {/* Score line */}
      <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth={2} />

      {/* Dots + labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xOf(i)} cy={yOf(p.score)} r={4} fill="var(--accent)" />
          <text
            x={xOf(i)}
            y={H - 6}
            textAnchor="middle"
            fontSize={9}
            fill="var(--muted)"
          >
            {p.label}
          </text>
          <text
            x={xOf(i)}
            y={yOf(p.score) - 8}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="var(--text)"
          >
            {p.score}
          </text>
        </g>
      ))}
    </svg>
  );
}
