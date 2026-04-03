"use client";

import Link from "next/link";

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  dailyCalories: Record<string, number>;
  targetCalories?: number;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  // 0 = Sunday, adjust to Monday-start: Mon=0, Tue=1, ..., Sun=6
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarGrid({
  year,
  month,
  dailyCalories,
  targetCalories,
}: CalendarGridProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = new Date();
  const todayKey = formatDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  function getColor(cals: number): string {
    if (!targetCalories) return "bg-glow-indigo/20";
    const ratio = cals / targetCalories;
    if (ratio <= 0.85) return "bg-glow-green/25";
    if (ratio <= 1.05) return "bg-glow-amber/25";
    return "bg-glow-pink/25";
  }

  return (
    <div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[0.65rem] font-medium text-muted-foreground/60 py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const key = formatDateKey(year, month, day);
          const cals = dailyCalories[key];
          const hasCals = cals !== undefined && cals > 0;
          const isToday = key === todayKey;

          return (
            <Link
              key={key}
              href={`/calendar/${key}`}
              className={`
                aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5
                transition-colors hover:bg-white/[0.08]
                ${hasCals ? getColor(cals) : ""}
                ${isToday ? "ring-1 ring-brand/60" : ""}
              `}
            >
              <span
                className={`text-xs font-medium ${
                  isToday ? "text-brand" : "text-foreground/80"
                }`}
              >
                {day}
              </span>
              {hasCals && (
                <span className="text-[0.6rem] tabular-nums text-muted-foreground leading-none">
                  {cals}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
