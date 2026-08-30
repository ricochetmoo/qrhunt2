"use client";

import type {Dashboard} from "@/server/admin/dashboard/types";
import {DynamicIcon, IconName} from "lucide-react/dynamic";

type MetadataItemProps = {
    name: string;
    value: string;
    icon: IconName;
    show?: boolean;
};

function MetadataItem({name, value, icon, show = true}: MetadataItemProps) {
    if (!show) {
        return null;
    }

    return (
        <div>
            <p className="text-xs uppercase flex gap-2">
                <DynamicIcon name={icon} className="h-3 w-3"/> {name}
            </p>
            <p>{value}</p>
        </div>
    );
}

export function GameMetadata({game}: { game: Dashboard["game"] }) {
    return (
        <header className="mb-6">
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                <MetadataItem name={'Status'} value={game.status ?? "unknown"} icon={'rocket'}/>
                <MetadataItem name={'Pause reason'} value={game.pauseReason ?? "unknown"} icon={'pause'}
                              show={!!game.pauseReason}/>
                <MetadataItem name={'Created'} value={new Date(game.createdAt).toLocaleString()} icon={'clock'}/>
                <MetadataItem name={'Updated'} value={new Date(game.updatedAt).toLocaleString()} icon={'clock'}/>
            </div>
        </header>
    );
}
