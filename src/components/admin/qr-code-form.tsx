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
  latitude: string;
  longitude: string;
};

const EMPTY: QrCodeFormValues = { name: "", hint: "", latitude: "", longitude: "" };

export function toQrCodeInput(values: QrCodeFormValues): QrCodeInput {
  return {
    name: values.name,
    hint: values.hint,
    latitude: values.latitude.trim() || null,
    longitude: values.longitude.trim() || null,
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

  const update = (key: keyof QrCodeFormValues) => (value: string) =>
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
