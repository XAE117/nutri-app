import { Skeleton } from "@/components/ui/skeleton";

/** Dashboard-specific skeleton matching real content shapes */
export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Calorie gauge area */}
      <div className="flex flex-col items-center gap-2 py-4">
        <Skeleton className="h-[140px] w-[240px] rounded-full" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Macro progress bars */}
      <div className="space-y-3 px-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Macro rings */}
      <div className="flex justify-around py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>

      {/* Entry cards */}
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
