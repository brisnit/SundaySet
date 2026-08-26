import {
  HeaderSkeleton,
  LoadingRegion,
  Skeleton,
} from "@/components/ui/skeleton";

/** Mirrors the set workspace: setlist and team left, details right. */
export default function Loading() {
  return (
    <LoadingRegion>
      <HeaderSkeleton />
      <div className="mb-6 flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="grid gap-5 lg:col-span-3">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <div className="grid gap-5 lg:col-span-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </LoadingRegion>
  );
}
