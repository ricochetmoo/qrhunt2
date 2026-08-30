import type { Progress, Scanned } from "@/server/admin/dashboard/types";
import { MapPin } from "lucide-react";

type Props = {
    progress: Progress;
};

type LastScan = Extract<Scanned, { scanned: true }>;

function latestScan(scans: Scanned[]): LastScan | undefined {
    return scans
        .filter((s): s is LastScan => s.scanned)
        .sort((a, b) => new Date(b.scan.createdAt).getTime() - new Date(a.scan.createdAt).getTime())[0];
}

function relativeTime(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60_000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleString();
}

export function TeamLastScans({ progress }: Props) {
    return (
        <section aria-label="Last scans" className="mb-6">
            <h2>Last scans</h2>
            <ul className="flex flex-col gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-3">
                {progress.map(({ team, scans }) => {
                    const last = latestScan(scans);
                    const hasLocation = last && last.code.latitude && last.code.longitude;

                    return (
                        <li key={team.id} className="rounded-lg border border-gray-200 bg-white p-3">
                            <p className="text-sm font-medium">{team.name}</p>
                            {last ? (
                                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                    <span>{last.code.name}</span>
                                    <span
                                        title={new Date(last.scan.createdAt).toLocaleString()}
                                    >
                                        {relativeTime(new Date(last.scan.createdAt))}
                                    </span>
                                    {hasLocation && (
                                        <a
                                            href={`https://maps.google.com/?q=${last.code.latitude},${last.code.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-auto inline-flex items-center gap-1 text-blue-600 hover:underline"
                                            aria-label={`Open location of ${last.code.name} in maps`}
                                        >
                                            <MapPin className="h-3 w-3" />
                                            Map
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <p className="mt-1 text-xs text-gray-400">No scans yet</p>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
