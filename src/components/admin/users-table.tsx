import Link from "next/link";

import type { AdminUser } from "@/server/domain/users";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function UsersTable({ users, emptyMessage }: { users: AdminUser[]; emptyMessage: string }) {
  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Teams</th>
            <th className="px-4 py-3 font-medium">Signed up</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">
                <Link href={`/admin/users/${u.id}`} className="hover:underline">
                  {u.name || "-"}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600">
                <span className="font-mono text-xs">{u.email}</span>
              </td>
              <td className="px-4 py-3">
                {u.isAnonymous ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    Player
                  </span>
                ) : (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                    Account
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {u.teams.length === 0 ? (
                  <span className="text-slate-400">-</span>
                ) : (
                  <ul className="space-y-0.5">
                    {u.teams.map((team) => (
                      <li key={team.teamId}>
                        {team.teamName}{" "}
                        <Link
                          href={`/admin/games/${team.gameId}/dashboard`}
                          className="text-xs text-slate-500 hover:underline"
                        >
                          ({team.gameName})
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                {dateFormat.format(u.createdAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/users/${u.id}`}
                  className="text-xs font-medium text-slate-700 hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
