import { Card, CardContent } from "@/components/ui/card";

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
  unit = "g",
}: {
  label: string;
  value: number;
  target?: number;
  unit?: string;
}) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : null;

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
            className="h-1.5 rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
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
        {/* Calories hero */}
        <div className="text-center">
          <p className="text-3xl font-bold">{Math.round(calories)}</p>
          <p className="text-sm text-muted-foreground">
            calories{targetCalories ? ` / ${targetCalories}` : ""}{" "}
            · {entryCount} {entryCount === 1 ? "entry" : "entries"}
          </p>
          {targetCalories && (
            <div className="mx-auto mt-2 h-2 w-full max-w-xs rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${calPct}%` }}
              />
            </div>
          )}
        </div>

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
