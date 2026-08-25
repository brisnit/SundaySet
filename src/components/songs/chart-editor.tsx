"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import type { FormState } from "@/app/(app)/songs/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

const SECTION_TYPES = [
  ["VERSE", "Verse"], ["PRECHORUS", "Pre-chorus"], ["CHORUS", "Chorus"],
  ["BRIDGE", "Bridge"], ["INTRO", "Intro"], ["OUTRO", "Outro"],
  ["TAG", "Tag"], ["INSTRUMENTAL", "Instrumental"], ["OTHER", "Other"],
] as const;

export type EditorSection = { label: string; type: string; body: string };

export function ChartEditor({
  action,
  songTitle,
  songId,
  initialKey,
  initialCapo,
  initialSections,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  songTitle: string;
  songId: string;
  initialKey: string;
  initialCapo: string;
  initialSections: EditorSection[];
}) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const [sections, setSections] = useState<EditorSection[]>(
    initialSections.length > 0
      ? initialSections
      : [{ label: "Verse 1", type: "VERSE", body: "" }],
  );

  const update = (i: number, patch: Partial<EditorSection>) =>
    setSections((s) => s.map((sec, j) => (j === i ? { ...sec, ...patch } : sec)));

  const move = (i: number, delta: number) =>
    setSections((s) => {
      const j = i + delta;
      if (j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <form action={formAction} className="grid gap-5">
      {state.error ? (
        <p role="alert" className="rounded-lg border border-clay/30 bg-clay-soft px-3 py-2 text-sm text-clay">
          {state.error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Chart settings</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Key" htmlFor="key" hint="The key this chart is written in">
            <Input id="key" name="key" defaultValue={initialKey} placeholder="G" />
          </Field>
          <Field label="Capo" htmlFor="capo" hint="Leave blank for none">
            <Input id="capo" name="capo" type="number" min={0} max={11} defaultValue={initialCapo} />
          </Field>
        </CardBody>
      </Card>

      {sections.map((section, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-1 pb-1 text-ink-subtle">
              <GripVertical aria-hidden className="size-4" />
            </div>
            <Field label="Section" htmlFor={`label-${i}`} className="min-w-40 flex-1">
              <Input
                id={`label-${i}`}
                name="sectionLabel"
                value={section.label}
                onChange={(e) => update(i, { label: e.target.value })}
                required
              />
            </Field>
            <Field label="Type" htmlFor={`type-${i}`} className="w-44">
              <Select
                id={`type-${i}`}
                name="sectionType"
                value={section.type}
                onChange={(e) => update(i, { type: e.target.value })}
              >
                {SECTION_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
            <div className="flex gap-1 pb-0.5">
              <Button type="button" variant="ghost" size="sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${section.label} up`}>↑</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => move(i, 1)} disabled={i === sections.length - 1} aria-label={`Move ${section.label} down`}>↓</Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSections((s) => s.filter((_, j) => j !== i))}
                aria-label={`Remove ${section.label}`}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <label htmlFor={`body-${i}`} className="sr-only">
              {section.label} chords and lyrics
            </label>
            <Textarea
              id={`body-${i}`}
              name="sectionBody"
              rows={7}
              value={section.body}
              onChange={(e) => update(i, { body: e.target.value })}
              spellCheck={false}
              className="chord-chart overflow-x-auto text-[13px] leading-6"
              placeholder={"G          D/F#      Em\nAmazing grace how sweet the sound"}
            />
            <p className="mt-1.5 text-xs text-ink-subtle">
              Put chords on their own line above the lyrics they sit over.
              SetMeister keeps the two paired so it can transpose later.
            </p>
          </CardBody>
        </Card>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setSections((s) => [...s, { label: `Section ${s.length + 1}`, type: "VERSE", body: "" }])
          }
        >
          <Plus aria-hidden />
          Add section
        </Button>
      </div>

      <div className="flex gap-2 border-t border-line pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : `Save chart for ${songTitle}`}
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/songs/${songId}`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
