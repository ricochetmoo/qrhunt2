import Link from "next/link";
import { notFound } from "next/navigation";

import { GameForm } from "@/components/admin/game-form";
import { PosterPrintButton } from "@/components/admin/poster-print-button";
import { QrImageExportButton } from "@/components/admin/qr-image-export-button";
import { QrCodeList } from "@/components/admin/qr-code-list";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { getGameWithRoute } from "@/server/domain/games";

export default async function GameEditPage({ params }: PageProps<"/admin/games/[gameId]/edit">) {
  const { gameId } = await params;
  const result = await getGameWithRoute(gameId);

  if (!result) {
    notFound();
  }

  const { game, qrCodes } = result;
  // Route stops only: the wildcard and the finish-line code sit outside the route.
  const onRoute = qrCodes.filter(
    (code) => code.isActive && !code.isWildcard && !code.isCompletion,
  ).length;
  const spares = qrCodes.filter((code) => !code.isActive).length;
  const hasFinishLine = qrCodes.some((code) => code.isActive && code.isCompletion);

  return (
    <div className="space-y-6">
      <PageHeader
        title={game.name}
        description={`Game code ${game.gameCode} · ${onRoute} ${onRoute === 1 ? "stop" : "stops"} on the route${hasFinishLine ? " · finish-line code set" : ""}${spares > 0 ? ` · ${spares} spare ${spares === 1 ? "code" : "codes"}` : ""}`}
        actions={
          <>
            <PosterPrintButton gameId={game.id} />
            <QrImageExportButton gameId={game.id} />
            <Link
              href={`/admin/games/${game.id}/dashboard`}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              View dashboard
            </Link>
            <Link
              href={`/admin/games/${game.id}/badges`}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Badges
            </Link>
            <StatusBadge status={game.status} />
          </>
        }
      />

      <Card>
        <CardHeader title="Game settings" />
        <CardBody>
          <GameForm mode="edit" game={game} />
        </CardBody>
      </Card>

      <QrCodeList key={qrCodes.map((c) => `${c.id}:${c.sortOrder}`).join(",")} gameId={game.id} qrCodes={qrCodes} />
    </div>
  );
}
