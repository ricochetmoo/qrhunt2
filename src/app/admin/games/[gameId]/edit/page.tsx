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
  const editableGame = {
    id: game.id,
    name: game.name,
    status: game.status,
    pauseReason: game.pauseReason,
    helpText: game.helpText,
    completionMessage: game.completionMessage,
    feedbackUrl: game.feedbackUrl,
    gameCode: game.gameCode,
    gameMode: game.gameMode,
    allowOutOfOrder: game.allowOutOfOrder,
    allowSelfSignup: game.allowSelfSignup,
    allowTeamCreation: game.allowTeamCreation,
    allowTeamNames: game.allowTeamNames,
    allowTeamPhotos: game.allowTeamPhotos,
    routeSignupEnabled: game.routeSignupEnabled,
    wildcardEnabled: game.wildcardEnabled,
    wildcardName: game.wildcardName,
    staggeredStart: game.staggeredStart,
    // Keep the page a Server Component while passing only RSC-safe values to the client form.
    qrRemoveBy: game.qrRemoveBy?.toISOString() ?? null,
    issueContactPhone: game.issueContactPhone,
  };

  return (
    <div className="space-y-6">
      <AdminHuntName gameId={game.id} name={game.name} />
      <PageHeader
        title={game.name}
        description={`Game code ${game.gameCode} · ${onRoute} ${onRoute === 1 ? "stop" : "stops"} on the route${hasFinishLine ? " · finish-line code set" : ""}${spares > 0 ? ` · ${spares} spare ${spares === 1 ? "code" : "codes"}` : ""}`}
        actions={
          <div className="self-start">
            <StatusBadge status={game.status} />
          </div>
        }
      />

      <Card>
        <CardHeader title="Game settings" />
        <CardBody>
          <GameForm mode="edit" game={editableGame} />
        </CardBody>
      </Card>

      <QrCodeList key={qrCodes.map((c) => `${c.id}:${c.sortOrder}`).join(",")} gameId={game.id} qrCodes={qrCodes} />
    </div>
  );
}
