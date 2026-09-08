"use client";

import { useState } from "react";

import { ErrorMessage } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { readError } from "@/lib/api-errors";
import { downloadFile } from "@/lib/download-file";

export function PosterPrintButton({ gameId }: { gameId: string }) {
  return (
    <div className="flex flex-col items-start gap-[15px] min-[641px]:flex-row min-[641px]:flex-wrap min-[641px]:gap-x-5 min-[641px]:gap-y-0">
      <PdfDownloadButton gameId={gameId} format="poster" />
      <PdfDownloadButton gameId={gameId} format="labels" />
    </div>
  );
}

function PdfDownloadButton({ gameId, format }: { gameId: string; format: "poster" | "labels" }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formatLabel = format === "labels" ? "stickers" : "posters";

  async function handleDownload() {
    if (pending) return;

    setError(null);
    setPending(true);

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

      await downloadFile(response, `qr-${formatLabel}.pdf`);
    } catch (caught) {
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
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        className="scouts-navigation__link cursor-pointer text-left disabled:cursor-wait disabled:opacity-50"
        onClick={handleDownload}
        disabled={pending}
        aria-busy={pending}
      >
        <span className="inline-flex items-center gap-2">
          {pending ? <Spinner size="sm" inline label="" /> : null}
          {pending ? `Generating ${formatLabel}…` : `Generate & download ${formatLabel}`}
        </span>
      </button>
      <ErrorMessage message={error} />
    </div>
  );
}
