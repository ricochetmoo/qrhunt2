"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/field";
import { readError } from "@/lib/api-errors";

export function PosterPrintButton({ gameId }: { gameId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePrint(format: "poster" | "labels") {
    if (pending) return;

    setError(null);
    setPending(true);

    // Open the window during the click so browsers do not block it while the
    // server generates the PDF.
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setError(
        `Allow pop-ups for this site to print the ${format === "labels" ? "stickers" : "posters"}.`,
      );
      setPending(false);
      return;
    }

    const formatLabel = format === "labels" ? "stickers" : "posters";
    printWindow.document.title = `Generating QR ${formatLabel}…`;
    printWindow.document.body.innerHTML =
      `<p style="font: 16px sans-serif; padding: 2rem">Generating QR ${formatLabel}…</p>`;

    try {
      const query = format === "labels" ? "?format=labels" : "";
      const response = await fetch(
        `/api/admin/games/${encodeURIComponent(gameId)}/poster-pdf${query}`,
        {
          method: "POST",
          credentials: "same-origin",
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const pdfUrl = URL.createObjectURL(await response.blob());
      printWindow.location.href = pdfUrl;
      printWindow.focus();

      // Give the browser's PDF viewer time to load before opening its print
      // dialog. The PDF remains available in the tab if printing is cancelled.
      window.setTimeout(() => {
        try {
          printWindow.print();
        } catch {
          // The PDF viewer can still be printed manually from the new tab.
        }
      }, 1000);

      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
    } catch (caught) {
      printWindow.close();
      setError(
        caught instanceof Error
          ? caught.message
          : `Failed to generate ${formatLabel}.`,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end justify-end gap-2">
      <Button
        variant="secondary"
        size="sm"
        type="button"
        className="!px-3 !py-1.5 !text-sm"
        onClick={() => handlePrint("poster")}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Generating…" : "Generate & print posters"}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        type="button"
        className="!px-3 !py-1.5 !text-sm"
        onClick={() => handlePrint("labels")}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Generating…" : "Generate & print stickers"}
      </Button>
      <ErrorMessage message={error} />
    </div>
  );
}
