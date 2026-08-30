import type { Progress } from "@/server/admin/dashboard/types";

type Props = {
  progress: Progress;
};

export function ProgressBar({ progress }: Props) {
  const totalCells = progress.reduce((sum, row) => sum + row.scans.length, 0);
  const completedCells = progress.reduce(
    (sum, row) => sum + row.scans.filter((s) => s.scanned).length,
    0,
  );
  const percentage = totalCells === 0 ? 0 : Math.round((completedCells / totalCells) * 100);

  return (
    <div className="mb-6">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">Overall game progress</span>
        <span className="text-slate-500">{percentage}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-slate-900 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
