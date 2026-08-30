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
        <div className="mb-4">
            <h2>Overall game progress</h2>
            <div className="mb-1 flex items-center text-xs text-gray-500">
                {percentage}%
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                    className="h-full rounded-full bg-[#7143dc] transition-all"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
