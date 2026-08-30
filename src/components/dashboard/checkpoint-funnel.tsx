import { DynamicIcon } from "lucide-react/dynamic";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { CheckpointStat } from "@/lib/dashboard";

export type CheckpointFunnelProps = {
  checkpoints: CheckpointStat[];
};

export function CheckpointFunnel({ checkpoints }: CheckpointFunnelProps) {
  const maxReached = Math.max(1, ...checkpoints.map((c) => c.reached));

  return (
    <Card>
      <CardHeader
        title="Checkpoints"
        description="How many teams reached each stop, and where they are dropping off."
      />
      <CardBody>
        <ol className="flex flex-col gap-3">
          {checkpoints.map((checkpoint) => {
            const width = Math.round((checkpoint.reached / maxReached) * 100);

            return (
              <li key={checkpoint.code.id}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-slate-700">
                    {checkpoint.index + 1}. {checkpoint.code.name}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {checkpoint.reached} {checkpoint.reached === 1 ? "team" : "teams"}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                  {checkpoint.dropOff > 0 && (
                    <span>
                      {checkpoint.dropOff} dropped off after this stop
                    </span>
                  )}
                  {checkpoint.stuck > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <DynamicIcon name="hourglass" className="h-3 w-3" />
                      {checkpoint.stuck} stuck here
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}
