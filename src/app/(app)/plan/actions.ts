"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/data/context";
import { createService, deleteService, updateService } from "@/lib/data/services";
import { serviceInputSchema } from "@/lib/validation/service";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

function parseService(formData: FormData) {
  return serviceInputSchema.safeParse({
    date: formData.get("date"),
    serviceTypeId: formData.get("serviceTypeId"),
    startTime: formData.get("startTime"),
    callTime: formData.get("callTime"),
    title: formData.get("title"),
    notes: formData.get("notes"),
    status: formData.get("status") || undefined,
    sermonTitle: formData.get("sermonTitle"),
    sermonSeries: formData.get("sermonSeries"),
    sermonScripture: formData.get("sermonScripture"),
    sermonDescription: formData.get("sermonDescription"),
  });
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "form");
    out[key] ??= i.message;
  }
  return out;
}

export async function createServiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requirePermission("services:manage");

  const parsed = parseService(formData);
  if (!parsed.success) {
    return {
      error: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  let serviceId: string;
  try {
    const service = await createService(ctx, parsed.data);
    serviceId = service.id;
  } catch (e) {
    if (e instanceof NotFoundError) {
      return { error: "That service time no longer exists. Pick another." };
    }
    throw e;
  }

  revalidatePath("/plan");
  revalidatePath("/home");
  redirect(`/plan/${serviceId}`);
}

export async function updateServiceAction(
  serviceId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requirePermission("services:manage");

  const parsed = parseService(formData);
  if (!parsed.success) {
    return {
      error: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  try {
    await updateService(ctx, serviceId, parsed.data);
  } catch (e) {
    if (e instanceof NotFoundError) {
      return { error: "That service no longer exists." };
    }
    throw e;
  }

  revalidatePath("/plan");
  revalidatePath("/home");
  revalidatePath(`/plan/${serviceId}`);
  redirect(`/plan/${serviceId}`);
}

export async function deleteServiceAction(serviceId: string) {
  const ctx = await requirePermission("services:manage");
  await deleteService(ctx, serviceId);
  revalidatePath("/plan");
  revalidatePath("/home");
  redirect("/plan");
}
