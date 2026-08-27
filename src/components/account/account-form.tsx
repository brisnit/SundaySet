"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, Upload } from "lucide-react";

import {
  removeAvatarAction,
  updateAccountAction,
  uploadAvatarAction,
  type FormState,
} from "@/app/(app)/settings/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { AVATAR_COLORS } from "@/lib/validation/account";
import { cn } from "@/lib/utils";

export type AccountValues = {
  name: string;
  email: string;
  phone: string;
  image: string | null;
  avatarColor: string | null;
  role: string;
};

export function AccountForm({
  values,
  uploadsEnabled,
}: {
  values: AccountValues;
  uploadsEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateAccountAction,
    {} as FormState,
  );
  const [avatarState, avatarAction, avatarPending] = useActionState(
    uploadAvatarAction,
    {} as FormState,
  );
  const [busy, start] = useTransition();
  const router = useRouter();
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Your icon</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              name={values.name || values.email}
              image={values.image}
              color={values.avatarColor}
              size={64}
            />
            <div className="min-w-0 text-sm text-ink-muted">
              {values.image
                ? "Using your uploaded photo."
                : "Pick a colour for your initials, or upload a photo."}
            </div>
          </div>

          {/* Colour always works — it needs no file storage at all. */}
          <form action={action} className="grid gap-3">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink">
                Monogram colour
              </legend>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c) => (
                  <label
                    key={c.value}
                    className="cursor-pointer"
                    title={c.label}
                  >
                    <input
                      type="radio"
                      name="avatarColor"
                      value={c.value}
                      defaultChecked={values.avatarColor === c.value}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-full text-xs font-semibold ring-offset-2 peer-checked:ring-2 peer-checked:ring-ember peer-focus-visible:ring-2 peer-focus-visible:ring-ember",
                        c.className,
                      )}
                    >
                      {c.label.slice(0, 1)}
                    </span>
                    <span className="sr-only">{c.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Name and phone save with the colour, in one action. */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="name" error={err("name")}>
                <Input id="name" name="name" defaultValue={values.name} required />
              </Field>
              <Field
                label="Phone"
                htmlFor="phone"
                hint="Optional."
                error={err("phone")}
              >
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  defaultValue={values.phone}
                />
              </Field>
            </div>

            {state.error ? (
              <p role="alert" className="text-sm text-clay">
                {state.error}
              </p>
            ) : null}
            {state.ok ? (
              <p role="status" className="flex items-center gap-1.5 text-sm text-sage">
                <Check aria-hidden className="size-4" />
                Saved
              </p>
            ) : null}

            <div>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>

          {uploadsEnabled ? (
            <form action={avatarAction} className="grid gap-2 border-t border-line pt-4">
              <label htmlFor="avatar" className="text-sm font-medium text-ink">
                Upload a photo
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="avatar"
                  name="avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  className="min-w-0 flex-1 text-xs text-ink-muted file:mr-3 file:rounded-lg file:border file:border-line-strong file:bg-surface file:px-3 file:py-1.5 file:text-xs file:text-ink"
                />
                <Button type="submit" variant="secondary" size="sm" disabled={avatarPending}>
                  <Upload aria-hidden />
                  {avatarPending ? "Uploading…" : "Upload"}
                </Button>
                {values.image ? (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      start(async () => {
                        await removeAvatarAction();
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 aria-hidden />
                    Remove
                  </Button>
                ) : null}
              </div>
              {avatarState.error ? (
                <p role="alert" className="text-xs text-clay">
                  {avatarState.error}
                </p>
              ) : null}
              <p className="text-xs text-ink-subtle">JPEG, PNG or WebP, up to 4MB.</p>
            </form>
          ) : (
            <p className="border-t border-line pt-4 text-xs text-ink-subtle">
              Photo uploads need file storage configured. Your monogram colour
              works either way.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
