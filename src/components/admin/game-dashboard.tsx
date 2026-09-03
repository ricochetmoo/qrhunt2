"use client";

import Link from "next/link";

import { ActivitySparkline } from "@/components/dashboard/activity-sparkline";
import { CheckpointFunnel } from "@/components/dashboard/checkpoint-funnel";
import { GameMetadata } from "@/components/dashboard/game-metadata";
import { Leaderboard } from "@/components/dashboard/leaderboard";
import { ProgressTable } from "@/components/dashboard/progress-table";
import { StalledTeams } from "@/components/dashboard/stalled-teams";
import { SummaryStats } from "@/components/dashboard/summary-stats";
import { TeamLastScans } from "@/components/dashboard/team-last-scans";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { useDashboard } from "@/hooks/useDashboard";
import {
  buildActivitySeries,
  buildCheckpointStats,
  buildStandings,
  scannedCount,
} from "@/lib/dashboard";

export function GameDashboard({ gameId }: { gameId: string }) {
  const { dashboard, error, isLoading } = useDashboard(gameId);

  if (error) {
    return <p className="text-sm text-red-600">Failed to load dashboard: {error}</p>;
  }

  if (isLoading || !dashboard) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  const { game, route, progress, serverTime } = dashboard;
  const nowMs = Date.parse(serverTime);

  const standings = buildStandings(progress, nowMs);
  const checkpoints = buildCheckpointStats(route, progress);
  const activity = buildActivitySeries(progress, nowMs);

  const teams = progress.length;
  const players = progress.reduce((n, row) => n + row.memberCount, 0);
  const scans = progress.reduce((n, row) => n + scannedCount(row.scans), 0);
  const totalCells = progress.reduce((n, row) => n + row.scans.length, 0);
  const stalled = standings.filter((standing) => standing.stalled).length;

  const rankByTeam = new Map(standings.map((standing, rank) => [standing.team.id, rank]));
  const orderedProgress = [...progress].sort(
    (a, b) => (rankByTeam.get(a.team.id) ?? 0) - (rankByTeam.get(b.team.id) ?? 0),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={game.name}
        description="Live team progress and scan activity."
        actions={
          <>
            <Link
              href={`/admin/games/${game.id}/badges`}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Badges
            </Link>
            <Link
              href={`/admin/games/${game.id}/edit`}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Manage game
            </Link>
            <Link
              href="/admin/games"
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              ← Back to games
            </Link>
          </>
        }
      />

      <Card>
        <CardBody>
          <GameMetadata game={game} />
        </CardBody>
      </Card>

      <SummaryStats
        teams={teams}
        players={players}
        scans={scans}
        completedCells={scans}
        totalCells={totalCells}
        stalled={stalled}
        lastUpdatedAt={serverTime}
        nowMs={nowMs}
      />

      {progress.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">
              No teams yet. Teams appear here once players join and start scanning.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          <Leaderboard standings={standings} nowMs={nowMs} />

          <Card>
            <CardHeader title="Progress matrix" description="Relative scan time per checkpoint." />
            <CardBody>
              <ProgressTable codes={route} progress={orderedProgress} nowMs={nowMs} />
            </CardBody>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <CheckpointFunnel checkpoints={checkpoints} />
            <ActivitySparkline series={activity} />
          </div>

          <StalledTeams standings={standings} nowMs={nowMs} />

          <Card>
            <CardHeader title="Last scans" />
            <CardBody>
              <TeamLastScans progress={orderedProgress} />
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
