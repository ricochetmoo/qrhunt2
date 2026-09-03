import { redirect } from "next/navigation";

import { requireAdminGamePage } from "@/server/auth/require-admin-page";

export default async function GameIndexPage({ params }: PageProps<"/admin/games/[gameId]">) {
  const { gameId } = await params;
  await requireAdminGamePage(gameId);

  redirect(`/admin/games/${gameId}/dashboard`);
}
