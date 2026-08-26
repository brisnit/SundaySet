"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { FormState } from "@/app/(app)/team/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { titleCase } from "@/lib/format";

export type PositionOption = {
  id: string;
  name: string;
  category: string;
};

export type ServiceTypeOption = { id: string; name: string };

export type TeamMemberFormValues = {
  name: string;
  email: string;
  phone: string;
  vocalRange: string;
  notes: string;
  active: boolean;
  preferredPerMonth: string;
  preferredServiceTypeId: string;
  positionIds: string[];
};

export function TeamMemberForm({
  action,
  values,
  positions,
  serviceTypes,
  submitLabel,
  cancelHref,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  values: TeamMemberFormValues;
  positions: PositionOption[];
  serviceTypes: ServiceTypeOption[];
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const err = (k: string) => state.fieldErrors?.[k];

  const byCategory = positions.reduce<Record<string, PositionOption[]>>(
    (acc, p) => {
      (acc[p.category] ??= []).push(p);
      return acc;
    },
    {},
  );

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
          <CardTitle>Who they are</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            htmlFor="name"
            error={err("name")}
            className="sm:col-span-2"
          >
            <Input id="name" name="name" defaultValue={values.name} required />
          </Field>

          <Field
            label="Email"
            htmlFor="email"
            hint="Optional. Needed later to send them their schedule."
            error={err("email")}
          >
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              defaultValue={values.email}
            />
          </Field>

          <Field label="Phone" htmlFor="phone" hint="Optional." error={err("phone")}>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={values.phone}
            />
          </Field>

          <div className="sm:col-span-2">
            <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                name="active"
                defaultChecked={values.active}
                className="size-4 accent-[var(--ember)]"
              />
              <span>
                Currently serving
                <span className="block text-xs text-ink-subtle">
                  Turn this off to keep their history without scheduling them.
                </span>
              </span>
            </label>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What they play</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-5">
          <p className="text-xs leading-relaxed text-ink-subtle">
            Pick every position this person can cover. Someone who sings and
            plays acoustic should have both.
          </p>

          {positions.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No positions set up yet.
            </p>
          ) : (
            Object.entries(byCategory).map(([category, options]) => (
              <fieldset key={category} className="grid gap-1.5">
                <legend className="mb-1.5 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                  {titleCase(category)}
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {options.map((p) => (
                    <label
                      key={p.id}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-xs text-ink-muted has-checked:border-ember has-checked:bg-ember-soft has-checked:text-ember-ink"
                    >
                      <input
                        type="checkbox"
                        name="positionIds"
                        value={p.id}
                        defaultChecked={values.positionIds.includes(p.id)}
                        className="size-3.5 accent-[var(--ember)]"
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))
          )}

          <Field
            label="Vocal range"
            htmlFor="vocalRange"
            hint="Optional. Helps when choosing keys."
            error={err("vocalRange")}
          >
            <Input
              id="vocalRange"
              name="vocalRange"
              defaultValue={values.vocalRange}
              placeholder="Alto, or A2–C5"
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduling preferences</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Times per month"
            htmlFor="preferredPerMonth"
            hint="How often they'd like to play. 0 means no preference."
            error={err("preferredPerMonth")}
          >
            <Input
              id="preferredPerMonth"
              name="preferredPerMonth"
              type="number"
              min={0}
              max={31}
              defaultValue={values.preferredPerMonth}
            />
          </Field>

          <Field
            label="Preferred slot"
            htmlFor="preferredServiceTypeId"
            hint="Optional."
            error={err("preferredServiceTypeId")}
          >
            <Select
              id="preferredServiceTypeId"
              name="preferredServiceTypeId"
              defaultValue={values.preferredServiceTypeId}
            >
              <option value="">No preference</option>
              {serviceTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Notes"
            htmlFor="notes"
            hint="Anything worth remembering when scheduling."
            error={err("notes")}
            className="sm:col-span-2"
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
