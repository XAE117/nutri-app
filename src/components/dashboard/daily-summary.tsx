interface DailySummaryProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  entryCount: number;
}

export function DailySummary({
  calories,
  protein,
  carbs,
  fat,
  fiber,
  entryCount,
}: DailySummaryProps) {
  return (
    <div className="space-y-4">
      {/* Main calorie display */}
      <div className="text-center">
        <p className="text-4xl font-bold tabular-nums">{Math.round(calories)}</p>
        <p className="text-sm text-muted-foreground">
          calories today &middot; {entryCount} {entryCount === 1 ? "entry" : "entries"}
        </p>
      </div>

      {/* Macro breakdown */}
      <div className="grid grid-cols-4 gap-2">
        <MacroItem label="Protein" value={protein} unit="g" />
        <MacroItem label="Carbs" value={carbs} unit="g" />
        <MacroItem label="Fat" value={fat} unit="g" />
        <MacroItem label="Fiber" value={fiber} unit="g" />
      </div>
    </div>
  );
}

function MacroItem({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="text-center rounded-lg bg-muted/50 p-2">
      <p className="text-lg font-semibold tabular-nums">
        {Math.round(value)}
        <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
