import { BadgeQueue } from "@/components/admin/badge-queue";
import { requireAdminGamePage } from "@/server/auth/require-admin-page";

/**
 * The finish-line desk: teams that have checked in (scanned the "I'm done"
 * code and given feedback), waiting for an organiser to hand over a badge.
 */
export default async function AdminGameBadgesPage({
  params,
}: PageProps<"/admin/games/[gameId]/badges">) {
  const { gameId } = await params;
  await requireAdminGamePage(gameId);

  return <BadgeQueue gameId={gameId} />;
}
