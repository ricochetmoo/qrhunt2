import { DynamicIcon } from "lucide-react/dynamic";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatDuration, formatEtaClock, relativeTime } from "@/lib/dashboard";
import type { TeamStanding } from "@/lib/dashboard";

const RANK_STYLES: Record<number, string> = {
  0: "bg-amber-100 text-amber-800 ring-amber-300",
  1: "bg-slate-200 text-slate-700 ring-slate-400",
  2: "bg-orange-100 text-orange-800 ring-orange-300",
};

function rankBadgeClass(rank: number): string {
  return cn(
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1",
    RANK_STYLES[rank] ?? "bg-slate-100 text-slate-500 ring-slate-200",
  );
}

export type LeaderboardProps = {
  standings: TeamStanding[];
  nowMs: number;
};

export function Leaderboard({ standings, nowMs }: LeaderboardProps) {
  const leader = standings.find((s) => s.furthestIndex >= 0);

  return (
    <Card>
      <CardHeader
        title="Leaderboard"
        description="Ranked by furthest checkpoint reached, then earliest arrival."
      />
      <CardBody>
        <ol className="flex flex-col gap-3">
          {standings.map((standing, rank) => (
            <li
              key={standing.team.id}
              className={cn(
                "rounded-lg border border-slate-200 p-3",
                leader && standing.team.id === leader.team.id && "border-slate-300 bg-slate-50",
              )}
            >
              <div className="flex items-center gap-3">
                <span className={rankBadgeClass(rank)}>{rank + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {standing.team.name}
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {standing.memberCount} {standing.memberCount === 1 ? "player" : "players"}
                      </span>
                    </p>
                    <p className="shrink-0 text-xs font-medium text-slate-500">
                      {standing.completed}/{standing.total}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900 transition-all"
                      style={{ width: `${Math.round(standing.ratio * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-9 text-xs text-slate-500">
                {standing.furthestName ? (
                  <span className="inline-flex items-center gap-1">
                    <DynamicIcon name="flag" className="h-3 w-3" />
                    at {standing.furthestName}
                  </span>
                ) : (
                  <span className="text-slate-400">No scans yet</span>
                )}
                {standing.paceMs !== null && (
                  <span className="inline-flex items-center gap-1">
                    <DynamicIcon name="timer" className="h-3 w-3" />
                    {formatDuration(standing.paceMs)}/stop
                  </span>
                )}
                {standing.etaMs !== null && (
                  <span className="inline-flex items-center gap-1">
                    <DynamicIcon name="clock" className="h-3 w-3" />
                    finish ~{formatEtaClock(standing.etaMs, nowMs)}
                  </span>
                )}
                {standing.lastScanAt !== null && (
                  <span className="ml-auto text-slate-400">
                    {relativeTime(standing.lastScanAt, nowMs)}
                  </span>
                )}
                {standing.stalled && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                    <DynamicIcon name="hourglass" className="h-3 w-3" />
                    Stalled
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}
