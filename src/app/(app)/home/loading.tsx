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
      <div className="mb-10 h-[104px] animate-pulse rounded-2xl bg-sunken" />
      <SectionLabelSkeleton />
      <RowsSkeleton rows={4} />
    </LoadingRegion>
  );
}
