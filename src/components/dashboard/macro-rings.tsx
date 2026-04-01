"use client";

import { useEffect, useState } from "react";

interface RingProps {
  value: number;
  target?: number;
  /** Percentage 0-100 used when no target (proportional mode) */
  proportion?: number;
  label: string;
  color: string;
  size?: number;
}

function Ring({ value, target, proportion, label, color, size = 80 }: RingProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after paint
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // If target exists, show progress toward target. Otherwise show proportion of total macros.
  const pct = target && target > 0
    ? Math.min(100, (value / target) * 100)
    : proportion ?? 0;

  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  // Unique filter ID per color
  const filterId = `glow-${color.replace("#", "")}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        {/* Noisy glow layer behind the ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${color}40 0%, ${color}15 40%, transparent 70%)`,
            filter: "blur(8px)",
            transform: "scale(1.3)",
            opacity: mounted ? 1 : 0,
            transition: "opacity 2s ease-out",
            animation: mounted ? "ring-glow-pulse 4s ease-in-out 1" : "none",
          }}
        />
        <svg width={size} height={size} className="relative -rotate-90">
          <defs>
            {/* Turbulence-based noisy glow filter */}
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
              <feColorMatrix
                in="noise"
                type="saturate"
                values="0"
                result="monoNoise"
              />
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feComposite in="blur" in2="monoNoise" operator="in" result="noisyGlow" />
              <feMerge>
                <feMergeNode in="noisyGlow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={6}
            className="text-muted"
          />
          {/* Filled arc with noisy glow filter */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeDasharray={circumference}
            strokeDashoffset={mounted ? offset : circumference}
            strokeLinecap="round"
            filter={`url(#${filterId})`}
            style={{
              transition: "stroke-dashoffset 1.8s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium">{Math.round(value)}g</p>
        <p className="text-[10px] text-muted-foreground">
          {label}
          {target ? ` / ${target}g` : proportion !== undefined ? ` (${Math.round(proportion)}%)` : ""}
        </p>
      </div>
    </div>
  );
}

interface MacroRingsProps {
  protein: number;
  carbs: number;
  fat: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}

export function MacroRings({
  protein,
  carbs,
  fat,
  targetProtein,
  targetCarbs,
  targetFat,
}: MacroRingsProps) {
  const hasTargets = targetProtein || targetCarbs || targetFat;
  const total = protein + carbs + fat;

  // Proportional mode: each macro as % of total grams
  const proteinPct = total > 0 ? (protein / total) * 100 : 0;
  const carbsPct = total > 0 ? (carbs / total) * 100 : 0;
  const fatPct = total > 0 ? (fat / total) * 100 : 0;

  return (
    <div className="flex items-center justify-around py-2">
      <Ring
        value={protein}
        target={hasTargets ? targetProtein : undefined}
        proportion={!hasTargets ? proteinPct : undefined}
        label="Protein"
        color="#5eead4"
      />
      <Ring
        value={carbs}
        target={hasTargets ? targetCarbs : undefined}
        proportion={!hasTargets ? carbsPct : undefined}
        label="Carbs"
        color="#fcd34d"
      />
      <Ring
        value={fat}
        target={hasTargets ? targetFat : undefined}
        proportion={!hasTargets ? fatPct : undefined}
        label="Fat"
        color="#f472b6"
      />
    </div>
  );
}
