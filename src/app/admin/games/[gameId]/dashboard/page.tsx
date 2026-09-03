import { GameDashboard } from "@/components/admin/game-dashboard";
import { requireAdminGamePage } from "@/server/auth/require-admin-page";

export default async function AdminGameDashboardPage({
  params,
}: PageProps<"/admin/games/[gameId]/dashboard">) {
  const { gameId } = await params;
  await requireAdminGamePage(gameId);

  return <GameDashboard gameId={gameId} />;
}
