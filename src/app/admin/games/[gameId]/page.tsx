import { notFound } from "next/navigation";

import { GameForm } from "@/components/admin/game-form";
import { QrCodeList } from "@/components/admin/qr-code-list";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { getGameWithRoute } from "@/server/domain/games";

export default async function GamePage({ params }: PageProps<"/admin/games/[gameId]">) {
  const { gameId } = await params;
  const result = await getGameWithRoute(gameId);

  if (!result) {
    notFound();
  }

  const { game, qrCodes } = result;

  return (
    <div className="space-y-6">
      <PageHeader
        title={game.name}
        description={`${qrCodes.length} ${qrCodes.length === 1 ? "code" : "codes"} on the route`}
        actions={<StatusBadge status={game.status} />}
      />

      <Card>
        <CardHeader title="Game settings" />
        <CardBody>
          <GameForm
            mode="edit"
            game={{
              id: game.id,
              name: game.name,
              status: game.status,
              pauseReason: game.pauseReason,
            }}
          />
        </CardBody>
      </Card>

      <QrCodeList key={qrCodes.map((c) => `${c.id}:${c.sortOrder}`).join(",")} gameId={game.id} qrCodes={qrCodes} />
    </div>
  );
}
