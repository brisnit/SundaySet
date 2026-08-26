import { HeaderSkeleton, LoadingRegion, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingRegion>
      <HeaderSkeleton />
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="grid gap-5 lg:col-span-3">
          <Skeleton className="h-44 rounded-xl" />
        </div>
        <div className="grid gap-5 lg:col-span-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </LoadingRegion>
  );
}
