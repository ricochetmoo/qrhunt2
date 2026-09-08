"use client";

import { useState } from "react";

import { ErrorMessage } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { readError } from "@/lib/api-errors";
import { downloadFile } from "@/lib/download-file";

export function QrImageExportButton({ gameId }: { gameId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (pending) return;

    setError(null);
    setPending(true);

    try {
      const response = await fetch(
        `/api/admin/games/${encodeURIComponent(gameId)}/qr-images`,
        {
          method: "POST",
          credentials: "same-origin",
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      await downloadFile(response, "qr-images.zip");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to export QR images.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        className="scouts-navigation__link cursor-pointer text-left disabled:cursor-wait disabled:opacity-50"
        onClick={handleExport}
        disabled={pending}
        aria-busy={pending}
      >
        <span className="inline-flex items-center gap-2">
          {pending ? <Spinner size="sm" inline label="" /> : null}
          {pending ? "Exporting QR images…" : "Export QR images"}
        </span>
      </button>
      <ErrorMessage message={error} />
    </div>
  );
}
