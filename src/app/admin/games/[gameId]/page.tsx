import { redirect } from "next/navigation";

export default async function GameIndexPage({ params }: PageProps<"/admin/games/[gameId]">) {
  const { gameId } = await params;

  redirect(`/admin/games/${gameId}/dashboard`);
}
