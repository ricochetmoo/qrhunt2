import Link from "next/link";
import { notFound } from "next/navigation";

import { GameForm } from "@/components/admin/game-form";
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
  const onRoute = qrCodes.filter((code) => code.isActive && !code.isWildcard).length;
  const spares = qrCodes.filter((code) => !code.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={game.name}
        description={`Game code ${game.gameCode} · ${onRoute} ${onRoute === 1 ? "stop" : "stops"} on the route${spares > 0 ? ` · ${spares} spare ${spares === 1 ? "code" : "codes"}` : ""}`}
        actions={
          <>
            <Link
              href={`/admin/games/${game.id}/dashboard`}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              View dashboard
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
