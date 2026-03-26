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
    <div className="relative">
      {/* Aurora glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 -z-10"
      >
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 25% 40%, var(--glow-indigo), transparent 70%)",
            filter: "blur(36px)",
            animation: "aurora-drift-1 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse 50% 65% at 75% 25%, var(--glow-pink), transparent 70%)",
            filter: "blur(36px)",
            animation: "aurora-drift-2 11s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 50% 80%, var(--glow-teal), transparent 70%)",
            filter: "blur(36px)",
            animation: "aurora-drift-3 13s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse 45% 55% at 20% 70%, var(--glow-amber), transparent 70%)",
            filter: "blur(36px)",
            animation: "aurora-drift-4 9s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 80% 65%, var(--glow-green), transparent 70%)",
            filter: "blur(36px)",
            animation: "aurora-drift-5 15s ease-in-out infinite",
          }}
        />
        {/* Grain texture on glow */}
        <div
          className="absolute inset-0 rounded-2xl opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
            backgroundSize: "150px 150px",
          }}
        />
      </div>

      <Card className="relative">
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
                calories · {entryCount}{" "}
                {entryCount === 1 ? "entry" : "entries"}
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
    </div>
  );
}
