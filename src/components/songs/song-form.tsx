"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckboxGroup,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import type { FormState } from "@/app/(app)/songs/actions";
import { titleCase } from "@/lib/format";

/**
 * Song types offered in the product.
 *
 * The SongType enum still holds church-specific occasions (COMMUNION, ADVENT,
 * BAPTISM, OFFERING...) so existing data stays valid and no destructive
 * migration is needed — they are simply no longer offered here.
 */
const SONG_TYPES = ["UPBEAT", "MID_TEMPO", "REFLECTIVE", "RESPONSE", "PRAYER"];

export type SongFormValues = {
  title: string;
  artist: string;
  ccliNumber: string;
  defaultKey: string;
  churchKey: string;
  alternateKeys: string;
  bpm: string;
  tempoCategory: string;
  songTypes: string[];
  themes: string;
  difficulty: string;
  familiarity: string;
  status: string;
  leadVocalistPreference: string;
  lyrics: string;
  notes: string;
  spotifyUrl: string;
  appleMusicUrl: string;
  youtubeUrl: string;
};

export const EMPTY_SONG: SongFormValues = {
  title: "", artist: "", ccliNumber: "", defaultKey: "", churchKey: "",
  alternateKeys: "", bpm: "", tempoCategory: "", songTypes: [], themes: "",
  difficulty: "MODERATE", familiarity: "NEW", status: "ACTIVE",
  leadVocalistPreference: "", lyrics: "", notes: "",
  spotifyUrl: "", appleMusicUrl: "", youtubeUrl: "",
};

export function SongForm({
  action,
  values,
  submitLabel,
  cancelHref,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  values: SongFormValues;
  submitLabel: string;
  cancelHref: string;
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
          <CardTitle>The song</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="title" error={err("title")} className="sm:col-span-2">
            <Input id="title" name="title" defaultValue={values.title} required />
          </Field>
          <Field label="Artist" htmlFor="artist" error={err("artist")}>
            <Input id="artist" name="artist" defaultValue={values.artist} />
          </Field>
          <Field
            label="CCLI number"
            htmlFor="ccliNumber"
            hint="Optional. No CCLI integration is configured yet."
            error={err("ccliNumber")}
          >
            <Input id="ccliNumber" name="ccliNumber" defaultValue={values.ccliNumber} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How you play it</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Original key" htmlFor="defaultKey" error={err("defaultKey")}>
            <Input id="defaultKey" name="defaultKey" defaultValue={values.defaultKey} placeholder="G" />
          </Field>
          <Field
            label="Your key"
            htmlFor="churchKey"
            hint="What your band actually plays"
            error={err("churchKey")}
          >
            <Input id="churchKey" name="churchKey" defaultValue={values.churchKey} placeholder="D" />
          </Field>
          <Field label="BPM" htmlFor="bpm" error={err("bpm")}>
            <Input id="bpm" name="bpm" type="number" min={20} max={300} defaultValue={values.bpm} />
          </Field>
          <Field
            label="Alternate keys"
            htmlFor="alternateKeys"
            hint="Comma separated"
            error={err("alternateKeys")}
          >
            <Input id="alternateKeys" name="alternateKeys" defaultValue={values.alternateKeys} placeholder="A, Bb" />
          </Field>
          <Field label="Tempo" htmlFor="tempoCategory" error={err("tempoCategory")}>
            <Select id="tempoCategory" name="tempoCategory" defaultValue={values.tempoCategory}>
              <option value="">—</option>
              <option value="FAST">Fast</option>
              <option value="MEDIUM">Medium</option>
              <option value="SLOW">Slow</option>
            </Select>
          </Field>
          <Field label="Difficulty" htmlFor="difficulty" error={err("difficulty")}>
            <Select id="difficulty" name="difficulty" defaultValue={values.difficulty}>
              <option value="SIMPLE">Simple</option>
              <option value="MODERATE">Moderate</option>
              <option value="ADVANCED">Advanced</option>
            </Select>
          </Field>
          <Field
            label="Lead vocalist"
            htmlFor="leadVocalistPreference"
            hint="Who sings this best"
            error={err("leadVocalistPreference")}
            className="sm:col-span-3"
          >
            <Input
              id="leadVocalistPreference"
              name="leadVocalistPreference"
              defaultValue={values.leadVocalistPreference}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How SetMeister should use it</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-5">
          <CheckboxGroup
            legend="Song type"
            name="songTypes"
            selected={values.songTypes}
            options={SONG_TYPES.map((t) => ({ value: t, label: titleCase(t) }))}
          />
          <Field
            label="Themes"
            htmlFor="themes"
            hint="Comma separated. These drive sermon matching."
            error={err("themes")}
          >
            <Input id="themes" name="themes" defaultValue={values.themes} placeholder="grace, faithfulness, hope" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="How well you know it"
              htmlFor="familiarity"
              hint="Stops a set filling up with songs nobody knows"
              error={err("familiarity")}
            >
              <Select id="familiarity" name="familiarity" defaultValue={values.familiarity}>
                <option value="NEW">New</option>
                <option value="LEARNING">Learning</option>
                <option value="FAMILIAR">Familiar</option>
                <option value="CORE">Core song</option>
                <option value="RETIRED">Retired</option>
              </Select>
            </Field>
            <Field label="Status" htmlFor="status" error={err("status")}>
              <Select id="status" name="status" defaultValue={values.status}>
                <option value="ACTIVE">Active</option>
                <option value="RETIRED">Retired</option>
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links and notes</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Spotify" htmlFor="spotifyUrl" error={err("spotifyUrl")}>
            <Input id="spotifyUrl" name="spotifyUrl" defaultValue={values.spotifyUrl} inputMode="url" />
          </Field>
          <Field label="Apple Music" htmlFor="appleMusicUrl" error={err("appleMusicUrl")}>
            <Input id="appleMusicUrl" name="appleMusicUrl" defaultValue={values.appleMusicUrl} inputMode="url" />
          </Field>
          <Field label="YouTube" htmlFor="youtubeUrl" error={err("youtubeUrl")}>
            <Input id="youtubeUrl" name="youtubeUrl" defaultValue={values.youtubeUrl} inputMode="url" />
          </Field>
          <Field label="Notes" htmlFor="notes" error={err("notes")} className="sm:col-span-3">
            <Textarea id="notes" name="notes" rows={3} defaultValue={values.notes} />
          </Field>
          <Field
            label="Lyrics"
            htmlFor="lyrics"
            hint="Optional. Check your CCLI licence before storing full lyrics."
            error={err("lyrics")}
            className="sm:col-span-3"
          >
            <Textarea id="lyrics" name="lyrics" rows={6} defaultValue={values.lyrics} />
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
