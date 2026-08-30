import type { QrCode } from "@/db/schema";
import type { Progress, Scanned } from "@/server/admin/dashboard/types";
import { Check, Circle } from "lucide-react";

type Props = {
    codes: QrCode[];
    progress: Progress;
};

function ProgressItem({ item }: { item: Scanned }) {
    return (
        <span className={`inline-flex items-center gap-1 rounded-full  px-2.5 py-0.5 text-xs font-medium ${item.scanned ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {item.scanned
                ? (<><Check className="h-3 w-3" />Scanned</>)
                : (<><Circle className="h-3 w-3" />Not scanned</>)
            }
        </span>
    );
}

export function ProgressTable({ codes, progress }: Props) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                <thead>
                <tr>
                    <th className="border p-2 text-left align-top">Team</th>
                    {codes.map((code) => (
                        <th key={code.id} className="border p-2 text-left align-top">
                            {code.name}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {progress.map(({ team, scans }) => (
                    <tr key={team.id}>
                        <td className="border p-2">{team.name}</td>
                        {scans.map((item) => (
                            <td key={item.code.id} className="border p-2">
                                <ProgressItem item={item} />
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
