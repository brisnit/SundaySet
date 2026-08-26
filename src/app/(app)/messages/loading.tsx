import {
  HeaderSkeleton,
  LoadingRegion,
  RowsSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingRegion>
      <HeaderSkeleton />
      <RowsSkeleton rows={4} />
    </LoadingRegion>
  );
}
