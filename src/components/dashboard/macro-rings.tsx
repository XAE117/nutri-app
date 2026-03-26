"use client";

interface RingProps {
  value: number;
  target: number;
  label: string;
  color: string;
  size?: number;
}

function Ring({ value, target, label, color, size = 80 }: RingProps) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
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
        <p className="text-[10px] text-muted-foreground">{label}</p>
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
  targetProtein = 150,
  targetCarbs = 250,
  targetFat = 65,
}: MacroRingsProps) {
  return (
    <div className="flex items-center justify-around py-2">
      <Ring value={protein} target={targetProtein} label="Protein" color="#5eead4" />
      <Ring value={carbs} target={targetCarbs} label="Carbs" color="#fcd34d" />
      <Ring value={fat} target={targetFat} label="Fat" color="#f472b6" />
    </div>
  );
}
