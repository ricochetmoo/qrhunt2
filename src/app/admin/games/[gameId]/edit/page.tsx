import { AdminHuntName } from "@/components/admin/admin-nav";
import { notFound } from "next/navigation";

import { GameForm } from "@/components/admin/game-form";
import { QrCodeList } from "@/components/admin/qr-code-list";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { requireAdminGamePage } from "@/server/auth/require-admin-page";
import { getGameWithRoute } from "@/server/domain/games";

export default async function GameEditPage({ params }: PageProps<"/admin/games/[gameId]/edit">) {
  const { gameId } = await params;
  await requireAdminGamePage(gameId);
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
      <AdminHuntName gameId={game.id} name={game.name} />
      <PageHeader
        title={game.name}
        description={`Game code ${game.gameCode} · ${onRoute} ${onRoute === 1 ? "stop" : "stops"} on the route${hasFinishLine ? " · finish-line code set" : ""}${spares > 0 ? ` · ${spares} spare ${spares === 1 ? "code" : "codes"}` : ""}`}
        actions={<StatusBadge status={game.status} />}
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
