import { PageHeader } from "@/components/app/shell";
import { ServiceForm } from "@/components/services/service-form";
import { requirePermission } from "@/lib/auth/session";
import { listServiceTypes } from "@/lib/data/church";
import { todayUtc } from "@/lib/data/services";
import { toDateInputValue } from "@/lib/validation/service";

import { createServiceAction } from "../actions";

export const metadata = { title: "New service" };

/** The next occurrence of the service type's weekday, so the date starts sensibly. */
function nextDayOfWeek(dayOfWeek: number, from: Date): Date {
  const delta = (dayOfWeek - from.getUTCDay() + 7) % 7;
  return new Date(from.getTime() + delta * 86_400_000);
}

export default async function NewServicePage() {
  const ctx = await requirePermission("services:manage");
  const serviceTypes = await listServiceTypes(ctx);

  const preferred = serviceTypes[0];
  const today = todayUtc();
  const defaultDate = preferred
    ? nextDayOfWeek(preferred.dayOfWeek, today)
    : today;

  return (
    <>
      <PageHeader
        title="New service"
        subtitle="Set the date and time. The setlist and team come next."
      />
      <ServiceForm
        action={createServiceAction}
        serviceTypes={serviceTypes}
        submitLabel="Create service"
        cancelHref="/plan"
        showStatus={false}
        values={{
          date: toDateInputValue(defaultDate),
          serviceTypeId: preferred?.id ?? "",
          startTime: preferred?.defaultStartTime ?? "10:00",
          callTime: preferred?.defaultCallTime ?? "",
          title: "",
          notes: "",
          status: "DRAFT",
          sermonTitle: "",
          sermonSeries: "",
          sermonScripture: "",
          sermonDescription: "",
        }}
      />
    </>
  );
}
