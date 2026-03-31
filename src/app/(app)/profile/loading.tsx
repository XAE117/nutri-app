import { Skeleton } from "@/components/ui/skeleton";

/** Profile-specific skeleton */
export default function ProfileLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-20" />

      {/* Tabs */}
      <Skeleton className="h-8 w-full rounded-lg" />

      {/* Cards */}
      <div className="space-y-4 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
