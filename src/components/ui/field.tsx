import type * as React from "react";

import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const describedBy = error
    ? `${htmlFor}-error`
    : hint
      ? `${htmlFor}-hint`
      : undefined;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={describedBy} className="text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={describedBy} className="text-xs text-clay">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(control, "h-10 py-0", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return <textarea className={cn(control, className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(control, "h-10 py-0", className)} {...props} />;
}

/** Accessible multi-select built from real checkboxes rather than a listbox. */
export function CheckboxGroup({
  legend,
  name,
  options,
  selected,
}: {
  legend: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
}) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label
            key={o.value}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-xs text-ink-muted has-checked:border-ember has-checked:bg-ember-soft has-checked:text-ember-ink"
          >
            <input
              type="checkbox"
              name={name}
              value={o.value}
              defaultChecked={selected.includes(o.value)}
              className="size-3.5 accent-[var(--ember)]"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
