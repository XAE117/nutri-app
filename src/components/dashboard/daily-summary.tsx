import { Card, CardContent } from "@/components/ui/card";
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

const macroColors: Record<string, string> = {
  Protein: "#5eead4",
  Carbs: "#fcd34d",
  Fat: "#f472b6",
  Fiber: "#86efac",
};

function MacroRow({
  label,
  value,
  target,
  unit = "g",
}: {
  label: string;
  value: number;
  target?: number;
  unit?: string;
}) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : null;
  const barColor = macroColors[label] || "#818cf8";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {Math.round(value)}
          {unit}
          {target ? (
            <span className="text-muted-foreground"> / {target}{unit}</span>
          ) : null}
        </span>
      </div>
      {target && (
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
      )}
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
  const calPct = targetCalories
    ? Math.min(100, Math.round((calories / targetCalories) * 100))
    : null;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {/* Calories gauge */}
        {targetCalories ? (
          <div>
            <CalorieGauge calories={calories} target={targetCalories} />
            <p className="text-center text-xs text-muted-foreground mt-1">
              {entryCount} {entryCount === 1 ? "entry" : "entries"} today
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-3xl font-bold">{Math.round(calories)}</p>
            <p className="text-sm text-muted-foreground">
              calories · {entryCount} {entryCount === 1 ? "entry" : "entries"}
            </p>
          </div>
        )}

        {/* Macro breakdown */}
        <div className="space-y-2">
          <MacroRow label="Protein" value={protein} target={targetProtein} />
          <MacroRow label="Carbs" value={carbs} target={targetCarbs} />
          <MacroRow label="Fat" value={fat} target={targetFat} />
          <MacroRow label="Fiber" value={fiber} />
        </div>
      </CardContent>
    </Card>
  );
}
