"use client";

import { useEffect, useState } from "react";

interface CalorieGaugeProps {
  calories: number;
  target: number;
}

export function CalorieGauge({ calories, target }: CalorieGaugeProps) {
  const [animatedAngle, setAnimatedAngle] = useState(-90);

  // Gauge geometry
  const cx = 150;
  const cy = 140;
  const radius = 110;
  const startAngle = -180; // left
  const endAngle = 0; // right
  const sweep = endAngle - startAngle; // 180°

  // Scale: 0 to max (target * 1.2 so target isn't pegged at the end)
  const max = Math.round(target * 1.2);
  const clamped = Math.min(calories, max);
  const targetAngle = startAngle + (clamped / max) * sweep;

  // Animate needle on mount / value change
  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedAngle(targetAngle), 50);
    return () => clearTimeout(timeout);
  }, [targetAngle]);

  // Generate tick marks
  const majorTicks = 6; // 0, 500, 1000, 1500, 2000, 2500 etc.
  const step = max / majorTicks;
  const ticks = [];

  for (let i = 0; i <= majorTicks; i++) {
    const value = Math.round(step * i);
    const angle = startAngle + (i / majorTicks) * sweep;
    const rad = (angle * Math.PI) / 180;

    // Outer tick position
    const outerLen = radius + 2;
    const innerMajor = radius - 14;
    const innerMinor = radius - 8;

    // Major tick
    ticks.push({
      x1: cx + outerLen * Math.cos(rad),
      y1: cy + outerLen * Math.sin(rad),
      x2: cx + innerMajor * Math.cos(rad),
      y2: cy + innerMajor * Math.sin(rad),
      major: true,
      label: value,
      labelX: cx + (radius + 18) * Math.cos(rad),
      labelY: cy + (radius + 18) * Math.sin(rad),
    });

    // Minor ticks between majors
    if (i < majorTicks) {
      for (let j = 1; j < 5; j++) {
        const minorAngle = startAngle + ((i + j / 5) / majorTicks) * sweep;
        const minorRad = (minorAngle * Math.PI) / 180;
        ticks.push({
          x1: cx + outerLen * Math.cos(minorRad),
          y1: cy + outerLen * Math.sin(minorRad),
          x2: cx + innerMinor * Math.cos(minorRad),
          y2: cy + innerMinor * Math.sin(minorRad),
          major: false,
          label: null,
          labelX: 0,
          labelY: 0,
        });
      }
    }
  }

  // Needle endpoint
  const needleRad = (animatedAngle * Math.PI) / 180;
  const needleLen = radius - 20;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy + needleLen * Math.sin(needleRad);

  // Arc path for the scale
  const arcStart = {
    x: cx + radius * Math.cos((startAngle * Math.PI) / 180),
    y: cy + radius * Math.sin((startAngle * Math.PI) / 180),
  };
  const arcEnd = {
    x: cx + radius * Math.cos((endAngle * Math.PI) / 180),
    y: cy + radius * Math.sin((endAngle * Math.PI) / 180),
  };

  // Target marker position
  const targetFrac = Math.min(target / max, 1);
  const targetTickAngle = startAngle + targetFrac * sweep;
  const targetRad = (targetTickAngle * Math.PI) / 180;

  const overTarget = calories > target;
  const pct = target > 0 ? Math.round((calories / target) * 100) : 0;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 175" className="w-full max-w-[280px]">
        {/* Arc track */}
        <path
          d={`M ${arcStart.x} ${arcStart.y} A ${radius} ${radius} 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
          fill="none"
          stroke="oklch(1 0 0 / 8%)"
          strokeWidth="3"
        />

        {/* Filled arc up to current value */}
        {clamped > 0 && (
          <path
            d={describeArc(cx, cy, radius, startAngle, animatedAngle)}
            fill="none"
            stroke={overTarget ? "#f87171" : "#818cf8"}
            strokeWidth="3"
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        )}

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.major ? "oklch(0.85 0 0)" : "oklch(0.5 0 0)"}
              strokeWidth={t.major ? 2 : 1}
            />
            {t.major && t.label !== null && (
              <text
                x={t.labelX}
                y={t.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="oklch(0.6 0.015 265)"
                fontSize="10"
                fontWeight="500"
              >
                {t.label >= 1000 ? `${(t.label / 1000).toFixed(1)}k` : t.label}
              </text>
            )}
          </g>
        ))}

        {/* Target marker */}
        <line
          x1={cx + (radius - 16) * Math.cos(targetRad)}
          y1={cy + (radius - 16) * Math.sin(targetRad)}
          x2={cx + (radius + 4) * Math.cos(targetRad)}
          y2={cy + (radius + 4) * Math.sin(targetRad)}
          stroke="#4ade80"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke={overTarget ? "#f87171" : "#f59e0b"}
          strokeWidth="2"
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />

        {/* Needle pivot */}
        <circle cx={cx} cy={cy} r="5" fill="oklch(0.3 0.015 265)" stroke="oklch(0.5 0 0)" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r="2" fill="#f59e0b" />

        {/* CAL label */}
        <text
          x={cx}
          y={cy - 30}
          textAnchor="middle"
          fill="oklch(0.55 0.015 265)"
          fontSize="14"
          fontWeight="700"
          letterSpacing="2"
        >
          CAL
        </text>
      </svg>

      {/* Digital readout below */}
      <div className="text-center -mt-2">
        <span className="text-3xl font-bold tabular-nums">{Math.round(calories)}</span>
        <span className="text-sm text-muted-foreground ml-1">/ {target}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {pct}% of daily target
      </p>
    </div>
  );
}

// Helper: describe an SVG arc path
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}
