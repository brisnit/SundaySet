"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { FormState } from "@/app/(app)/plan/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

export type ServiceFormValues = {
  date: string;
  serviceTypeId: string;
  startTime: string;
  callTime: string;
  title: string;
  notes: string;
  status: string;
};

export type ServiceTypeOption = {
  id: string;
  name: string;
  defaultStartTime: string;
  defaultCallTime: string;
};

const STATUSES = [
  ["DRAFT", "Draft"],
  ["READY", "Ready"],
  ["INVITATIONS_SENT", "Invitations sent"],
  ["CONFIRMED", "Confirmed"],
  ["COMPLETED", "Completed"],
] as const;

export function ServiceForm({
  action,
  values,
  serviceTypes,
  submitLabel,
  cancelHref,
  showStatus,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  values: ServiceFormValues;
  serviceTypes: ServiceTypeOption[];
  submitLabel: string;
  cancelHref: string;
  showStatus: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <form action={formAction} className="grid gap-5">
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-clay/30 bg-clay-soft px-3 py-2 text-sm text-clay"
        >
          {state.error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>When</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="date" error={err("date")}>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={values.date}
              required
            />
          </Field>

          <Field
            label="Time slot"
            htmlFor="serviceTypeId"
            hint="Recurring slots you've set up"
            error={err("serviceTypeId")}
          >
            <Select
              id="serviceTypeId"
              name="serviceTypeId"
              defaultValue={values.serviceTypeId}
            >
              <option value="">No specific slot</option>
              {serviceTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Start time"
            htmlFor="startTime"
            hint="Local time, 24-hour"
            error={err("startTime")}
          >
            <Input
              id="startTime"
              name="startTime"
              type="time"
              defaultValue={values.startTime}
              required
            />
          </Field>

          <Field
            label="Call time"
            htmlFor="callTime"
            hint="When the team arrives. Optional."
            error={err("callTime")}
          >
            <Input
              id="callTime"
              name="callTime"
              type="time"
              defaultValue={values.callTime}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4">
          <Field
            label="Set name"
            htmlFor="title"
            hint="Optional. Unnamed sets are listed by their date."
            error={err("title")}
          >
            <Input
              id="title"
              name="title"
              defaultValue={values.title}
              placeholder="Sunday Morning"
            />
          </Field>

          {showStatus ? (
            <Field label="Status" htmlFor="status" error={err("status")}>
              <Select id="status" name="status" defaultValue={values.status}>
                {STATUSES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <input type="hidden" name="status" value={values.status} />
          )}

          <Field
            label="Planning notes"
            htmlFor="notes"
            hint="Only visible to planners."
            error={err("notes")}
          >
            <Textarea id="notes" name="notes" rows={3} defaultValue={values.notes} />
          </Field>
        </CardBody>
      </Card>


      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Button asChild variant="secondary">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
