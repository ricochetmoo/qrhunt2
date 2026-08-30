import Link from "next/link";

import { StatusBadge } from "@/components/ui/badge";
import type { Game } from "@/db/types";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function GamesTable({ games }: { games: Game[] }) {
  if (games.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
        No games yet. Create your first game to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Code</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Updated</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {games.map((game) => (
            <tr key={game.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">
                <Link href={`/admin/games/${game.id}`} className="hover:underline">
                  {game.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs tracking-wider text-slate-700">
                  {game.gameCode}
                </code>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={game.status} />
              </td>
              <td className="px-4 py-3 text-slate-500">{dateFormat.format(game.updatedAt)}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/games/${game.id}`}
                  className="text-xs font-medium text-slate-700 hover:underline"
                >
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
