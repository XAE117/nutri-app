"use client";

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
  // If target exists, show progress toward target. Otherwise show proportion of total macros.
  const pct = target && target > 0
    ? Math.min(100, (value / target) * 100)
    : proportion ?? 0;

  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={6}
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
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
