"use client";

import { useParams } from "next/navigation";

import { useDashboard } from "@/hooks/useDashboard";
import { GameMetadata } from "@/components/game-metadata";
import { ProgressBar } from "@/components/progress-bar";
import { ProgressTable } from "@/components/progress-table";
import {TeamLastScans} from "@/components/team-last-scans";

export default function AdminGameDashboardPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { dashboard, error, isLoading } = useDashboard(gameId);

  if (error) {
    return (
      <main className="p-6">
        <p className="text-sm">Failed to load dashboard: {error}</p>
      </main>
    );
  }

  if (isLoading || !dashboard) {
    return (
      <main className="p-6">
        <p className="text-sm">Loading…</p>
      </main>
    );
  }

  const { game, progress = [] } = dashboard;
  const codes = progress[0]?.scans.map((s) => s.code) ?? [];

  return (
    <main className="p-6 flex flex-col gap-6">
      <h1 className="text-lg">{game.name}</h1>
      <GameMetadata game={game} />
      <ProgressBar progress={progress} />
      <ProgressTable codes={codes} progress={progress} />
      <TeamLastScans progress={progress} />
    </main>
  );
}
