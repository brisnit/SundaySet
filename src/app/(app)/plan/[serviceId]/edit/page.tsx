import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/shell";
import { ServiceForm } from "@/components/services/service-form";
import { requirePermission } from "@/lib/auth/session";
import { listServiceTypes } from "@/lib/data/church";
import { NotFoundError } from "@/lib/data/context";
import { getServiceById } from "@/lib/data/services";
import { formatServiceDate } from "@/lib/format";
import { toDateInputValue } from "@/lib/validation/service";

import { updateServiceAction } from "../../actions";

export const metadata = { title: "Edit set" };

export default async function EditServicePage({
  params,
}: PageProps<"/plan/[serviceId]/edit">) {
  const { serviceId } = await params;
  const ctx = await requirePermission("services:manage");

  const [service, serviceTypes] = await Promise.all([
    getServiceById(ctx, serviceId).catch((e) => {
      if (e instanceof NotFoundError) notFound();
      throw e;
    }),
    listServiceTypes(ctx),
  ]);

  return (
    <>
      <PageHeader
        title="Edit set"
        subtitle={formatServiceDate(service.date, { year: true })}
      />
      <ServiceForm
        action={updateServiceAction.bind(null, serviceId)}
        serviceTypes={serviceTypes}
        submitLabel="Save changes"
        cancelHref={`/plan/${serviceId}`}
        showStatus
        values={{
          date: toDateInputValue(service.date),
          serviceTypeId: service.serviceTypeId ?? "",
          startTime: service.startTime,
          callTime: service.callTime ?? "",
          title: service.title ?? "",
          notes: service.notes ?? "",
          status: service.status,
        }}
      />
    </>
  );
}
