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
  // Always show the gauge — default to 2000 cal if no target set
  const gaugeTarget = targetCalories ?? 2000;

  return (
    <div className="relative isolate">
      {/* Aurora glow — peeks out at card edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 -z-10"
      >
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse 50% 40% at 10% 15%, var(--glow-indigo), transparent 60%)",
            filter: "blur(18px)",
            animation: "aurora-drift-1 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse 45% 35% at 90% 10%, var(--glow-pink), transparent 60%)",
            filter: "blur(18px)",
            animation: "aurora-drift-2 11s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse 35% 50% at 95% 55%, var(--glow-teal), transparent 60%)",
            filter: "blur(18px)",
            animation: "aurora-drift-3 13s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse 45% 35% at 10% 90%, var(--glow-amber), transparent 60%)",
            filter: "blur(18px)",
            animation: "aurora-drift-4 9s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse 50% 35% at 65% 95%, var(--glow-green), transparent 60%)",
            filter: "blur(18px)",
            animation: "aurora-drift-5 15s ease-in-out infinite",
          }}
        />
      </div>

      {/* Card — solid background covers the glow, glow only peeks at edges */}
      <div className="relative rounded-2xl bg-background p-5 space-y-4">
        {/* Analog calorie gauge — always visible */}
        <div>
          <CalorieGauge calories={calories} target={gaugeTarget} />
          <p className="text-center text-xs text-muted-foreground mt-1">
            {entryCount} {entryCount === 1 ? "entry" : "entries"} today
          </p>
        </div>

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
    </div>
  );
}
