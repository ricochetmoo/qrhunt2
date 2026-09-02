"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/field";
import type { QrCode } from "@/db/types";
import { apiClient } from "@/lib/api-client";
import { readError } from "@/lib/api-errors";

import { QrCodeForm, toQrCodeInput, type QrCodeFormValues } from "./qr-code-form";

interface QrCodeListProps {
  gameId: string;
  qrCodes: QrCode[];
}

export function QrCodeList({ gameId, qrCodes: initialCodes }: QrCodeListProps) {
  const router = useRouter();
  const [codes, setCodes] = useState(initialCodes);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const game = apiClient.api.admin.games[":gameId"];

  function handleAdd(values: QrCodeFormValues) {
    setError(null);
    startTransition(async () => {
      const response = await game["qr-codes"].$post({
        param: { gameId },
        json: toQrCodeInput(values),
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      const { qrCode } = await response.json();
      setCodes((current) => [...current, deserialize(qrCode)]);
      setAdding(false);
      router.refresh();
    });
  }

  function handleEdit(qrCodeId: string, values: QrCodeFormValues) {
    setError(null);
    startTransition(async () => {
      const response = await game["qr-codes"][":qrCodeId"].$patch({
        param: { gameId, qrCodeId },
        json: toQrCodeInput(values),
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      const { qrCode } = await response.json();
      setCodes((current) => current.map((c) => (c.id === qrCodeId ? deserialize(qrCode) : c)));
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDelete(code: QrCode) {
    if (!window.confirm(`Delete "${code.name}"? Scans of this code will also be removed.`)) return;

    setError(null);
    startTransition(async () => {
      const response = await game["qr-codes"][":qrCodeId"].$delete({
        param: { gameId, qrCodeId: code.id },
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      const { qrCodes } = await response.json();
      setCodes(qrCodes.map(deserialize));
      router.refresh();
    });
  }

  function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= codes.length) return;

    const previous = codes;
    const next = [...codes];
    [next[index], next[target]] = [next[target], next[index]];
    setCodes(next);
    setError(null);

    startTransition(async () => {
      const response = await game.route.order.$put({
        param: { gameId },
        json: { orderedIds: next.map((c) => c.id) },
      });

      if (!response.ok) {
        setCodes(previous);
        setError(await readError(response));
        return;
      }

      const { qrCodes } = await response.json();
      setCodes(qrCodes.map(deserialize));
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader
        title="Route"
        description="Players scan these codes in order. Each code is generated automatically."
        actions={
          !adding ? (
            <Button size="sm" onClick={() => setAdding(true)} disabled={pending}>
              Add QR code
            </Button>
          ) : null
        }
      />
      <CardBody className="space-y-4">
        <ErrorMessage message={error} />

        {codes.length === 0 && !adding ? (
          <p className="text-sm text-slate-500">No QR codes yet. Add the first location on the route.</p>
        ) : null}

        <ol className="divide-y divide-slate-100">
          {codes.map((code, index) => (
            <li key={code.id} className="py-3">
              {editingId === code.id ? (
                <QrCodeForm
                  idPrefix={`qr-${code.id}`}
                  initial={{
                    name: code.name,
                    hint: code.hint,
                    funFact: code.funFact ?? "",
                    latitude: code.latitude ?? "",
                    longitude: code.longitude ?? "",
                    isWildcard: code.isWildcard,
                    isActive: code.isActive,
                  }}
                  pending={pending}
                  submitLabel="Save"
                  onSubmit={(values) => handleEdit(code.id, values)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Move up"
                      onClick={() => handleMove(index, -1)}
                      disabled={pending || index === 0}
                    >
                      ▲
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Move down"
                      onClick={() => handleMove(index, 1)}
                      disabled={pending || index === codes.length - 1}
                    >
                      ▼
                    </Button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!code.isActive ? (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Spare
                        </span>
                      ) : code.isWildcard ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Wildcard
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          {codes.slice(0, index).filter((c) => c.isActive && !c.isWildcard).length + 1}.
                        </span>
                      )}
                      <span
                        className={
                          code.isActive ? "font-medium text-slate-900" : "font-medium text-slate-500"
                        }
                      >
                        {code.name}
                      </span>
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
                        {code.code.toUpperCase()}
                      </code>
                      {code.latitude && code.longitude ? (
                        <span className="text-xs text-slate-500">
                          {code.latitude}, {code.longitude}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{code.hint}</p>
                    {code.funFact ? (
                      <p className="mt-1 whitespace-pre-line text-xs text-slate-500">
                        <span className="font-semibold">Fun fact:</span> {code.funFact}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingId(code.id)}
                      disabled={pending}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => handleDelete(code)}
                      disabled={pending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>

        {adding ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">New QR code</h3>
            <QrCodeForm
              idPrefix="qr-new"
              pending={pending}
              submitLabel="Add to route"
              onSubmit={handleAdd}
              onCancel={() => setAdding(false)}
            />
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

/** JSON responses carry dates as strings; restore the `QrCode` shape. */
function deserialize(code: Omit<QrCode, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string }): QrCode {
  return { ...code, createdAt: new Date(code.createdAt), updatedAt: new Date(code.updatedAt) };
}
