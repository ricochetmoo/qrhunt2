import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { getUserDetail, type UserScanSummary } from "@/server/domain/users";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

function ScanSummary({ scan }: { scan: UserScanSummary | null }) {
  if (!scan) {
    return <span className="text-slate-400">No scans yet</span>;
  }

  return (
    <span>
      {scan.qrCodeName}{" "}
      <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-700">
        {scan.qrCodeCode}
      </code>
      <span className="block text-xs text-slate-500">{dateFormat.format(scan.scannedAt)}</span>
    </span>
  );
}

export default async function UserPage({ params }: PageProps<"/admin/users/[userId]">) {
  const { userId } = await params;
  const detail = await getUserDetail(userId);

  if (!detail) {
    notFound();
  }

  const { account, adminOf, engagements } = detail;

  return (
    <div className="space-y-6">
      <PageHeader
        title={account.name || account.email}
        description={account.isAnonymous ? "Anonymous player account" : "Registered account"}
        actions={
          <Link href="/admin/users" className="text-sm text-slate-600 hover:underline">
            ← All users
          </Link>
        }
      />

      <Card>
        <CardHeader title="Account" />
        <CardBody>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Name">{account.name || "—"}</Detail>
            <Detail label="Email">
              <span className="font-mono text-xs">{account.email}</span>
              {account.emailVerified ? (
                <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                  Verified
                </span>
              ) : null}
            </Detail>
            <Detail label="Type">{account.isAnonymous ? "Player (anonymous)" : "Account"}</Detail>
            <Detail label="Signed up">{dateFormat.format(account.createdAt)}</Detail>
            <Detail label="Last updated">{dateFormat.format(account.updatedAt)}</Detail>
            <Detail label="User ID">
              <span className="font-mono text-xs">{account.id}</span>
            </Detail>
          </dl>
        </CardBody>
      </Card>

      {adminOf.length > 0 ? (
        <Card>
          <CardHeader title="Administers" description="Games this account can manage." />
          <CardBody>
            <ul className="space-y-1 text-sm">
              {adminOf.map((game) => (
                <li key={game.id} className="flex items-center gap-2">
                  <Link href={`/admin/games/${game.id}`} className="font-medium hover:underline">
                    {game.name}
                  </Link>
                  <StatusBadge status={game.status} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Games"
          description={
            engagements.length === 0
              ? "Not a member of any team yet."
              : `In ${engagements.length} ${engagements.length === 1 ? "game" : "games"}.`
          }
        />
        {engagements.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {engagements.map((e) => (
              <CardBody key={e.team.id} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/games/${e.game.id}`}
                    className="text-base font-semibold text-slate-900 hover:underline"
                  >
                    {e.game.name}
                  </Link>
                  <StatusBadge status={e.game.status} />
                </div>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Detail label="Team">
                    {e.team.name}
                    <span className="block text-xs text-slate-500">
                      {e.team.memberCount} {e.team.memberCount === 1 ? "member" : "members"} · joined{" "}
                      {dateFormat.format(e.team.joinedAt)}
                    </span>
                  </Detail>
                  <Detail label="Team progress">
                    {e.route.teamCodesScanned} / {e.route.totalCodes} codes
                    <span className="block text-xs text-slate-500">
                      {e.teamScans.total} team {e.teamScans.total === 1 ? "scan" : "scans"} in total
                    </span>
                  </Detail>
                  <Detail label="This user's scans">{e.userScans.total}</Detail>
                  <Detail label="Last scan by this user">
                    <ScanSummary scan={e.userScans.last} />
                  </Detail>
                  <Detail label="Last scan by team">
                    <ScanSummary scan={e.teamScans.last} />
                  </Detail>
                </dl>
              </CardBody>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
