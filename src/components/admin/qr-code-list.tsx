"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, ScoutsCard } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/field";
import { SortableList, type SortableItem } from "@/components/ui/sortable-list";
import { Tag } from "@/components/ui/badge";
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
  const editingCode = editingId ? codes.find((code) => code.id === editingId) ?? null : null;
  const routeCodes = codes.filter(isRouteCode);
  const auxiliaryCodes = codes.filter((code) => !isRouteCode(code));
  const codesById = new Map(codes.map((code) => [code.id, code]));

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

  function handleRouteReorder(items: SortableItem[]) {
    const previous = codes;
    const routeIds = items.map((item) => item.id);
    const auxiliaryIds = auxiliaryCodes.map((code) => code.id);
    const orderedIds = [...routeIds, ...auxiliaryIds];
    const next = orderedIds
      .map((id) => codesById.get(id))
      .filter((code): code is QrCode => code !== undefined);

    setCodes(next);
    setError(null);

    startTransition(async () => {
      const response = await game.route.order.$put({
        param: { gameId },
        json: { orderedIds },
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
          !adding && !editingCode ? (
            <Button
              size="sm"
              onClick={() => {
                setAdding(true);
                setEditingId(null);
              }}
              disabled={pending}
            >
              Add QR code
            </Button>
          ) : null
        }
      />
      <CardBody className="space-y-4">
        <ErrorMessage message={error} />

        {adding || editingCode ? (
          <ScoutsCard
            variant="grey"
            title={adding ? "New QR code" : `Edit ${editingCode?.name ?? "QR code"}`}
            description={
              adding
                ? "Add a code to this game's route."
                : "Update this code without changing its position in the route."
            }
          >
            <QrCodeForm
              idPrefix={editingCode ? `qr-${editingCode.id}` : "qr-new"}
              initial={
                editingCode
                  ? {
                      name: editingCode.name,
                      hint: editingCode.hint,
                      funFact: editingCode.funFact ?? "",
                      latitude: editingCode.latitude ?? "",
                      longitude: editingCode.longitude ?? "",
                      isWildcard: editingCode.isWildcard,
                      isCompletion: editingCode.isCompletion,
                      isActive: editingCode.isActive,
                    }
                  : undefined
              }
              pending={pending}
              submitLabel={adding ? "Add to route" : "Save"}
              onSubmit={(values) =>
                editingCode ? handleEdit(editingCode.id, values) : handleAdd(values)
              }
              onCancel={() => {
                setAdding(false);
                setEditingId(null);
              }}
            />
          </ScoutsCard>
        ) : null}

        {routeCodes.length === 0 && !adding ? (
          <p className="text-sm text-scouts-muted">No route stops yet. Add the first location on the route.</p>
        ) : null}

        {routeCodes.length > 0 ? (
          <SortableList
            items={routeCodes.map(toSortableItem)}
            onReorder={handleRouteReorder}
            disabled={pending}
            renderActions={(item) => {
              const code = codesById.get(item.id);
              return code ? (
                <QrCodeActions
                  code={code}
                  disabled={pending}
                  onDelete={handleDelete}
                  onEdit={(id) => {
                    setAdding(false);
                    setEditingId(id);
                  }}
                />
              ) : null;
            }}
          />
        ) : null}

        {auxiliaryCodes.length > 0 ? (
          <section aria-labelledby="auxiliary-codes-heading" className="space-y-3">
            <div>
              <h3 id="auxiliary-codes-heading" className="text-lg font-extrabold text-scouts-text">
                Other codes
              </h3>
              <p className="mt-1 text-sm text-scouts-muted">
                These codes are not part of the ordered route.
              </p>
            </div>
            <ul className="divide-y divide-scouts-border-muted border-y border-scouts-border-muted">
              {auxiliaryCodes.map((code) => (
                <li key={code.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <AuxiliaryCodeTag code={code} />
                      <h4 className="font-bold text-scouts-text">{code.name}</h4>
                      <code className="bg-scouts-grey-light px-1.5 py-0.5 font-mono text-xs text-scouts-text">
                        {code.code.toUpperCase()}
                      </code>
                      {code.latitude && code.longitude ? (
                        <span className="text-xs text-scouts-muted">
                          {code.latitude}, {code.longitude}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-scouts-muted">{code.hint}</p>
                    {code.funFact ? (
                      <p className="mt-1 whitespace-pre-line text-xs text-scouts-muted">
                        <span className="font-bold">Fun fact:</span> {code.funFact}
                      </p>
                    ) : null}
                  </div>
                  <QrCodeActions
                    code={code}
                    disabled={pending}
                    onDelete={handleDelete}
                    onEdit={(id) => {
                      setAdding(false);
                      setEditingId(id);
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardBody>
    </Card>
  );
}

function isRouteCode(code: QrCode) {
  return code.isActive && !code.isWildcard && !code.isCompletion;
}

function toSortableItem(code: QrCode, index: number): SortableItem {
  return {
    id: code.id,
    title: (
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-scouts-muted">{index + 1}.</span>
        <span>{code.name}</span>
        <code className="bg-scouts-grey-light px-1.5 py-0.5 font-mono text-xs text-scouts-text">
          {code.code.toUpperCase()}
        </code>
      </span>
    ),
    description: (
      <>
        <span className="block whitespace-pre-line">{code.hint}</span>
        {code.funFact ? (
          <span className="mt-1 block whitespace-pre-line text-xs">
            <span className="font-bold">Fun fact:</span> {code.funFact}
          </span>
        ) : null}
        {code.latitude && code.longitude ? (
          <span className="mt-1 block text-xs">
            {code.latitude}, {code.longitude}
          </span>
        ) : null}
      </>
    ),
  };
}

function AuxiliaryCodeTag({ code }: { code: QrCode }) {
  if (!code.isActive) return <Tag variant="grey">Spare</Tag>;
  if (code.isCompletion) return <Tag variant="success">Finish line</Tag>;
  return <Tag variant="warning">Wildcard</Tag>;
}

function QrCodeActions({
  code,
  disabled,
  onEdit,
  onDelete,
}: {
  code: QrCode;
  disabled: boolean;
  onEdit: (id: string) => void;
  onDelete: (code: QrCode) => void;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <Button variant="secondary" size="sm" onClick={() => onEdit(code.id)} disabled={disabled}>
        Edit
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-scouts-red-dark"
        onClick={() => onDelete(code)}
        disabled={disabled}
      >
        Delete
      </Button>
    </div>
  );
}

/** JSON responses carry dates as strings; restore the `QrCode` shape. */
function deserialize(code: Omit<QrCode, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string }): QrCode {
  return { ...code, createdAt: new Date(code.createdAt), updatedAt: new Date(code.updatedAt) };
}
