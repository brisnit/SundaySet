import {
  HeaderSkeleton,
  LoadingRegion,
  RowsSkeleton,
  SectionLabelSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingRegion>
      <HeaderSkeleton />
      <SectionLabelSkeleton />
      <RowsSkeleton rows={6} />
    </LoadingRegion>
  );
}
