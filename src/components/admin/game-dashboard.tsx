"use client";

import { ActivitySparkline } from "@/components/dashboard/activity-sparkline";
import { CheckpointFunnel } from "@/components/dashboard/checkpoint-funnel";
import { CodeLastScans } from "@/components/dashboard/code-last-scans";
import { GameMetadata } from "@/components/dashboard/game-metadata";
import { Leaderboard } from "@/components/dashboard/leaderboard";
import { ProgressTable } from "@/components/dashboard/progress-table";
import { StalledTeams } from "@/components/dashboard/stalled-teams";
import { SummaryStats } from "@/components/dashboard/summary-stats";
import { TeamLastScans } from "@/components/dashboard/team-last-scans";
import {
  Message,
  PageHeader,
  ScoutsCard,
  ScoutsLink,
  Spinner,
  StatusBadge,
} from "@/components/ui";
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
    return (
      <div className="space-y-4">
        <Message title="Could not load dashboard" variant="danger">
          <p>{error}</p>
        </Message>
        <ScoutsLink href="/admin/games">Back to games</ScoutsLink>
      </div>
    );
  }

  if (isLoading || !dashboard) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading dashboard" size="lg" />
      </div>
    );
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
        actions={<ScoutsLink href="/admin/games" className="self-center">Back to games</ScoutsLink>}
      />

      <ScoutsCard title="Game details" titleExtras={<StatusBadge status={game.status} />}>
        <GameMetadata game={game} />
      </ScoutsCard>

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

      <StalledTeams standings={standings} nowMs={nowMs} />

      <CodeLastScans route={route} progress={progress} nowMs={nowMs} />

      {progress.length === 0 ? (
        <Message title="No teams yet" variant="info">
          Teams appear here once players join and start scanning.
        </Message>
      ) : (
        <>
          <Leaderboard standings={standings} nowMs={nowMs} />

          <ScoutsCard title="Progress matrix" description="Relative scan time per checkpoint.">
            <ProgressTable codes={route} progress={orderedProgress} nowMs={nowMs} />
          </ScoutsCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <CheckpointFunnel checkpoints={checkpoints} />
            <ActivitySparkline series={activity} />
          </div>

          <ScoutsCard title="Last scans">
            <TeamLastScans progress={orderedProgress} />
          </ScoutsCard>
        </>
      )}
    </div>
  );
}
