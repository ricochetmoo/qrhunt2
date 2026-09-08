"use client";

import { useState } from "react";

import { ErrorMessage } from "@/components/ui/field";
import { readError } from "@/lib/api-errors";

function filenameFromResponse(response: Response): string {
  const header = response.headers.get("Content-Disposition");
  const match = header?.match(/filename="([^"]+)"/i);

  return match?.[1] ?? "qr-images.zip";
}

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

      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = filenameFromResponse(response);
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
        {pending ? "Exporting…" : "Export QR images"}
      </button>
      <ErrorMessage message={error} />
    </div>
  );
}
