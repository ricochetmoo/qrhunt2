import { AdminHuntName } from "@/components/admin/admin-nav";
import { GameDashboard } from "@/components/admin/game-dashboard";
import { requireAdminGamePage } from "@/server/auth/require-admin-page";

export default async function AdminGameDashboardPage({
  params,
}: PageProps<"/admin/games/[gameId]/dashboard">) {
  const { gameId } = await params;
  const game = await requireAdminGamePage(gameId);

  return (
    <>
      <AdminHuntName gameId={game.id} name={game.name} />
      <GameDashboard gameId={gameId} />
    </>
  );
}
