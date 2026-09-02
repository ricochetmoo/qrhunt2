import { DynamicIcon } from "lucide-react/dynamic";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { relativeTime } from "@/lib/dashboard";
import type { TeamStanding } from "@/lib/dashboard";

export type StalledTeamsProps = {
  standings: TeamStanding[];
  nowMs: number;
};

export function StalledTeams({ standings, nowMs }: StalledTeamsProps) {
  const stalled = standings.filter((standing) => standing.stalled);

  if (stalled.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader
        title="Stalled teams"
        description="No scan in over 20 minutes - they may need help."
      />
      <CardBody>
        <ul className="flex flex-col gap-2">
          {stalled.map((standing) => (
            <li
              key={standing.team.id}
              className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
            >
              <DynamicIcon name="hourglass" className="h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{standing.team.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {standing.furthestName ? `Last at ${standing.furthestName}` : "No scans yet"}
                </p>
              </div>
              {standing.lastScanAt !== null && (
                <span className="shrink-0 text-xs text-amber-700">
                  {relativeTime(standing.lastScanAt, nowMs)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
