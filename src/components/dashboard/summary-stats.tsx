import { DynamicIcon } from "lucide-react/dynamic";
import type { IconName } from "lucide-react/dynamic";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/dashboard";

type StatProps = {
  label: string;
  value: string;
  icon: IconName;
};

function Stat({ label, value, icon }: StatProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
      <DynamicIcon name={icon} className="h-5 w-5 text-slate-400" />
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-lg font-semibold leading-tight text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export type SummaryStatsProps = {
  teams: number;
  players: number;
  scans: number;
  completedCells: number;
  totalCells: number;
  stalled: number;
  lastUpdatedAt: string;
  nowMs: number;
};

export function SummaryStats({
  teams,
  players,
  scans,
  completedCells,
  totalCells,
  stalled,
  lastUpdatedAt,
  nowMs,
}: SummaryStatsProps) {
  const percentage = totalCells === 0 ? 0 : Math.round((completedCells / totalCells) * 100);

  return (
    <Card>
      <CardHeader
        title="Overview"
        actions={
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Live · updated {relativeTime(lastUpdatedAt, nowMs)}
          </span>
        }
      />
      <CardBody>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Teams" value={String(teams)} icon="users" />
          <Stat label="Players" value={String(players)} icon="user" />
          <Stat label="Scans" value={String(scans)} icon="check" />
          <Stat label="Progress" value={`${percentage}%`} icon="gauge" />
          <Stat
            label="Stalled"
            value={String(stalled)}
            icon="alert-triangle"
          />
        </div>
        <p className={cn("mt-3 text-xs", stalled > 0 ? "text-amber-700" : "text-slate-400")}>
          {stalled > 0
            ? `${stalled} ${stalled === 1 ? "team has" : "teams have"} been idle for over 20 minutes.`
            : "No team has been idle for more than 20 minutes."}
        </p>
      </CardBody>
    </Card>
  );
}
