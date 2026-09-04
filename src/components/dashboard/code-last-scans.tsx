import type { QrCode } from "@/db/types";
import type { Progress } from "@/server/admin/dashboard/types";
import { ScoutsCard } from "@/components/ui/card";
import { Tag } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { buildCodeScanSummary, formatDuration, relativeTime } from "@/lib/dashboard";

type Props = {
  route: QrCode[];
  progress: Progress;
  nowMs: number;
};

function formatLastScanned(lastScannedAt: number | null, nowMs: number): string {
  return lastScannedAt === null ? "Not scanned yet" : relativeTime(lastScannedAt, nowMs);
}

export function CodeLastScans({ route, progress, nowMs }: Props) {
  const summary = buildCodeScanSummary(route, progress, nowMs);
  const overdueCount = summary.codes.filter((row) => row.overdue).length;
  const description =
    summary.averageAgeMs === null
      ? "Each route code and its latest scan will appear here."
      : `Average time since scan: ${formatDuration(summary.averageAgeMs)}. Rows are flagged after 100% longer.`;

  return (
    <ScoutsCard
      title="Code activity"
      description={description}
      variant="navy"
      titleExtras={
        overdueCount > 0 ? (
          <Tag variant="danger">
            {overdueCount} {overdueCount === 1 ? "needs" : "need"} attention
          </Tag>
        ) : null
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-base">
          <caption className="sr-only">Latest scan time for each route code</caption>
          <thead>
            <tr className="border-y-2 border-scouts-border text-left">
              <th scope="col" className="px-3 py-3 font-extrabold text-scouts-text">
                Code
              </th>
              <th scope="col" className="px-3 py-3 font-extrabold text-scouts-text">
                Last scanned
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.codes.length > 0 ? (
              summary.codes.map(({ code, lastScannedAt, overdue }, index) => (
                <tr
                  key={code.id}
                  className={cn(
                    "border-b border-scouts-border-muted",
                    overdue && "bg-scouts-red-light text-scouts-red-dark",
                  )}
                >
                  <td className="px-3 py-3 text-scouts-text">
                    <span className="font-extrabold">{index + 1}. {code.name}</span>
                    <code className="ml-2 text-sm text-scouts-muted">{code.code}</code>
                  </td>
                  <td className="px-3 py-3 text-scouts-text">
                    <span title={lastScannedAt === null ? undefined : new Date(lastScannedAt).toLocaleString()}>
                      {formatLastScanned(lastScannedAt, nowMs)}
                    </span>
                    {overdue ? <Tag variant="danger" className="ml-2">Needs attention</Tag> : null}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="px-3 py-3 text-scouts-muted">
                  No route codes configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ScoutsCard>
  );
}
