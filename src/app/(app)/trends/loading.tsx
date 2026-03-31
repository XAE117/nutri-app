import { Skeleton } from "@/components/ui/skeleton";

/** Trends-specific skeleton matching tabbed layout */
export default function TrendsLoading() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Skeleton className="h-7 w-20" />

      {/* Tabs */}
      <Skeleton className="h-8 w-full rounded-lg" />

      {/* Chart area */}
      <div className="rounded-lg border p-4">
        <Skeleton className="mb-3 h-5 w-40" />
        <Skeleton className="h-[280px] w-full rounded" />
      </div>

      {/* Averages grid */}
      <div className="rounded-lg border p-4">
        <Skeleton className="mb-3 h-5 w-28" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
