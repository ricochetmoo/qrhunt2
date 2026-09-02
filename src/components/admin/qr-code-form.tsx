"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import type { QrCodeInput } from "@/lib/admin-schemas";
import { useGeolocation } from "@/lib/use-geolocation";

export type QrCodeFormValues = {
  name: string;
  hint: string;
  funFact: string;
  latitude: string;
  longitude: string;
  isWildcard: boolean;
  isCompletion: boolean;
  isActive: boolean;
};

const EMPTY: QrCodeFormValues = {
  name: "",
  hint: "",
  funFact: "",
  latitude: "",
  longitude: "",
  isWildcard: false,
  isCompletion: false,
  isActive: true,
};

export function toQrCodeInput(values: QrCodeFormValues): QrCodeInput {
  return {
    name: values.name,
    hint: values.hint,
    funFact: values.funFact.trim() || null,
    latitude: values.latitude.trim() || null,
    longitude: values.longitude.trim() || null,
    isWildcard: values.isWildcard,
    isCompletion: values.isCompletion,
    isActive: values.isActive,
  };
}

interface QrCodeFormProps {
  idPrefix: string;
  initial?: QrCodeFormValues;
  pending: boolean;
  submitLabel: string;
  onSubmit: (values: QrCodeFormValues) => void;
  onCancel?: () => void;
}

export function QrCodeForm({
  idPrefix,
  initial = EMPTY,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: QrCodeFormProps) {
  const [values, setValues] = useState<QrCodeFormValues>(initial);
  const geo = useGeolocation();
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const update =
    <K extends keyof QrCodeFormValues>(key: K) =>
    (value: QrCodeFormValues[K]) =>
      setValues((current) => ({ ...current, [key]: value }));

  async function useCurrentLocation() {
    const coords = await geo.request();

    if (coords) {
      setValues((current) => ({
        ...current,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));
      setAccuracy(coords.accuracy);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Location name" htmlFor={`${idPrefix}-name`}>
        <Input
          id={`${idPrefix}-name`}
          value={values.name}
          onChange={(event) => update("name")(event.target.value)}
          required
          maxLength={120}
          autoFocus
        />
      </Field>
      <Field
        label="Hint"
        htmlFor={`${idPrefix}-hint`}
        hint="Revealed to players after they scan the previous code."
      >
        <Textarea
          id={`${idPrefix}-hint`}
          value={values.hint}
          onChange={(event) => update("hint")(event.target.value)}
          required
          maxLength={1000}
        />
      </Field>
      <Field
        label="Fun fact"
        htmlFor={`${idPrefix}-fun-fact`}
        hint="Optional. Shown with the scan result once players have found this stop."
      >
        <Textarea
          id={`${idPrefix}-fun-fact`}
          value={values.funFact}
          onChange={(event) => update("funFact")(event.target.value)}
          maxLength={1000}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude" htmlFor={`${idPrefix}-lat`} hint="Optional, e.g. 51.5007">
          <Input
            id={`${idPrefix}-lat`}
            inputMode="decimal"
            value={values.latitude}
            onChange={(event) => update("latitude")(event.target.value)}
          />
        </Field>
        <Field label="Longitude" htmlFor={`${idPrefix}-lng`} hint="Optional, e.g. -0.1246">
          <Input
            id={`${idPrefix}-lng`}
            inputMode="decimal"
            value={values.longitude}
            onChange={(event) => update("longitude")(event.target.value)}
          />
        </Field>
      </div>
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
          checked={values.isWildcard}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              isWildcard: event.target.checked,
              isCompletion: event.target.checked ? false : current.isCompletion,
            }))
          }
        />
        <span className="text-sm text-slate-700">
          This is the wildcard object
          <span className="block text-xs text-slate-500">
            Scanned at any point, outside the route order. One per game; only counts while the
            wildcard is enabled in game settings.
          </span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
          checked={values.isCompletion}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              isCompletion: event.target.checked,
              isWildcard: event.target.checked ? false : current.isWildcard,
            }))
          }
        />
        <span className="text-sm text-slate-700">
          This is the &quot;I&apos;m done&quot; finish-line code
          <span className="block text-xs text-slate-500">
            Put this poster at the Digital Team tent. Never part of the route: once a team has
            found every stop, scanning it opens the feedback form and checks them in for a
            badge. One per game.
          </span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
          checked={values.isActive}
          onChange={(event) => update("isActive")(event.target.checked)}
        />
        <span className="text-sm text-slate-700">
          In use
          <span className="block text-xs text-slate-500">
            Untick to keep this as a spare. Spares are printed on posters but are not part of the
            route, do not count towards progress, and cannot be scanned or used to join.
          </span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Button
            variant="secondary"
            size="sm"
            onClick={useCurrentLocation}
            disabled={pending || geo.pending}
          >
            {geo.pending ? "Locating…" : "Use my current location"}
          </Button>
          {geo.error ? (
            <span className="text-red-600">{geo.error}</span>
          ) : accuracy !== null ? (
            <span>Accurate to about {Math.round(accuracy)} m</span>
          ) : (
            <span>Stand at the QR code’s spot and tap to fill in the coordinates.</span>
          )}
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
