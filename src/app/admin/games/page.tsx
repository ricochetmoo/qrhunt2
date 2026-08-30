import Link from "next/link";

import { GamesTable } from "@/components/admin/games-table";
import { PageHeader } from "@/components/ui/card";
import { listGames } from "@/server/domain/games";

export default async function GamesPage() {
  const games = await listGames();

  return (
    <>
      <PageHeader
        title="Games"
        description="Create and manage QR Hunt games."
        actions={
          <Link
            href="/admin/games/new"
            className="inline-flex items-center rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            New game
          </Link>
        }
      />
      <GamesTable games={games} />
    </>
  );
}
