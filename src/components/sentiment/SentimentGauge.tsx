import React from "react";

interface SentimentGaugeProps {
  score: number;
  regime: string;
  previousScore?: number | null;
  lastUpdate?: string;
}

const ZONES = [
  { min: 0, max: 24, color: "#dc2626", label: "Extreme Fear" },
  { min: 25, max: 44, color: "#f97316", label: "Fear" },
  { min: 45, max: 55, color: "#eab308", label: "Neutral" },
  { min: 56, max: 75, color: "#22c55e", label: "Greed" },
  { min: 76, max: 100, color: "#15803d", label: "Extreme Greed" },
];

function getScoreColor(score: number): string {
  return ZONES.find((z) => score >= z.min && score <= z.max)?.color || "#6b7280";
}

function scoreToAngle(s: number): number {
  return Math.PI * (1 - s / 100);
}

function toXY(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
}

function arcPath(cx: number, cy: number, r: number, s1: number, s2: number) {
  const p1 = toXY(cx, cy, r, scoreToAngle(s1));
  const p2 = toXY(cx, cy, r, scoreToAngle(s2));
  const large = Math.abs(s2 - s1) > 50 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`;
}

export default function SentimentGauge({ score, regime, previousScore, lastUpdate }: SentimentGaugeProps) {
  const cx = 150, cy = 130, r = 100, sw = 14;
  const needleAngle = scoreToAngle(score);
  const tip = toXY(cx, cy, r - sw - 10, needleAngle);
  const change = previousScore != null ? Math.round(score - previousScore) : null;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 160" className="w-full max-w-[300px]">
        {/* Background zone arcs */}
        {ZONES.map((zone) => (
          <path
            key={zone.label}
            d={arcPath(cx, cy, r, zone.min, zone.max)}
            fill="none"
            stroke={zone.color}
            strokeWidth={sw}
            strokeLinecap="butt"
            opacity={0.2}
          />
        ))}

        {/* Active arcs up to score */}
        {ZONES.filter((z) => score > z.min).map((zone) => {
          const end = Math.min(score, zone.max);
          const start = zone.min;
          if (end <= start) return null;
          return (
            <path
              key={`active-${zone.label}`}
              d={arcPath(cx, cy, r, start, end)}
              fill="none"
              stroke={zone.color}
              strokeWidth={sw}
              strokeLinecap="butt"
            />
          );
        })}

        {/* Needle */}
        <circle cx={cx} cy={cy} r={5} className="fill-foreground" />
        <line
          x1={cx} y1={cy} x2={tip.x} y2={tip.y}
          className="stroke-foreground"
          strokeWidth={2.5}
          strokeLinecap="round"
        />

        {/* Score */}
        <text x={cx} y={cy - 32} textAnchor="middle" className="fill-foreground" fontSize={38} fontWeight="bold">
          {Math.round(score)}
        </text>
        <text x={cx} y={cy - 12} textAnchor="middle" fontSize={11} fontWeight="600" fill={getScoreColor(score)}>
          {regime}
        </text>

        {/* Labels */}
        <text x={cx - r - 8} y={cy + 18} textAnchor="middle" fontSize={9} className="fill-muted-foreground">
          Fear
        </text>
        <text x={cx + r + 8} y={cy + 18} textAnchor="middle" fontSize={9} className="fill-muted-foreground">
          Greed
        </text>
      </svg>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
        {change !== null && (
          <span className={change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : ""}>
            {change > 0 ? "▲" : change < 0 ? "▼" : "─"} {Math.abs(change)} vs anterior
          </span>
        )}
        {lastUpdate && <span>Atualizado: {lastUpdate}</span>}
      </div>
    </div>
  );
}
