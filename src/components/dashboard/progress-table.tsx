import type { QrCode } from "@/db/types";
import type { Progress, Scanned } from "@/server/admin/dashboard/types";
import { Check, Circle } from "lucide-react";

import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/dashboard";

type Props = {
  codes: QrCode[];
  progress: Progress;
  nowMs: number;
};

function ProgressItem({ item, isNext, nowMs }: { item: Scanned; isNext: boolean; nowMs: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        item.scanned ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700",
        isNext && !item.scanned && "ring-1 ring-slate-400",
      )}
    >
      {item.scanned ? (
        <>
          <Check className="h-3 w-3" />
          <span title={new Date(item.scan.createdAt).toLocaleString()}>
            {relativeTime(item.scan.createdAt, nowMs)}
          </span>
        </>
      ) : isNext ? (
        <>
          <Circle className="h-3 w-3" />
          Next
        </>
      ) : (
        <Circle className="h-3 w-3" />
      )}
    </span>
  );
}

export function ProgressTable({ codes, progress, nowMs }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Team</th>
            {codes.map((code, index) => (
              <th key={code.id} className="px-4 py-3 font-medium">
                {index + 1}. {code.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {progress.map(({ team, scans }) => {
            const nextIndex = scans.findIndex((item) => !item.scanned);

            return (
              <tr key={team.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{team.name}</td>
                {scans.map((item, index) => (
                  <td key={item.code.id} className="px-4 py-3">
                    <ProgressItem item={item} isNext={index === nextIndex} nowMs={nowMs} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
