import { CalorieGauge } from "./calorie-gauge";

interface DailySummaryProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  entryCount: number;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}

function MacroRow({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target?: number;
  color: string;
}) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : null;

  return (
    <div className="flex items-center gap-3">
      <div
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="w-12 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
        {target ? (
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        ) : null}
      </div>
      <span className="text-xs font-medium tabular-nums">
        {Math.round(value)}g
        {target ? (
          <span className="text-muted-foreground font-normal">
            {" "}
            / {target}g
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function DailySummary({
  calories,
  protein,
  carbs,
  fat,
  fiber,
  entryCount,
  targetCalories,
  targetProtein,
  targetCarbs,
  targetFat,
}: DailySummaryProps) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-4">
      {/* Calories hero */}
      {targetCalories ? (
        <div>
          <CalorieGauge calories={calories} target={targetCalories} />
          <p className="text-center text-xs text-muted-foreground mt-1">
            {entryCount} {entryCount === 1 ? "entry" : "entries"} today
          </p>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-4xl font-semibold tabular-nums tracking-tight">
            {Math.round(calories)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            calories · {entryCount} {entryCount === 1 ? "entry" : "entries"}
          </p>
        </div>
      )}

      {/* Separator */}
      <div className="h-px bg-white/[0.06]" />

      {/* Macro breakdown */}
      <div className="space-y-2.5">
        <MacroRow
          label="Protein"
          value={protein}
          target={targetProtein}
          color="#5eead4"
        />
        <MacroRow
          label="Carbs"
          value={carbs}
          target={targetCarbs}
          color="#fcd34d"
        />
        <MacroRow
          label="Fat"
          value={fat}
          target={targetFat}
          color="#f472b6"
        />
        <MacroRow label="Fiber" value={fiber} color="#86efac" />
      </div>
    </div>
  );
}
