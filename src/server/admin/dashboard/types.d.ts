import {Game, QrCode, QrCodeScan, Team} from "@/db/schema";

export type Scanned = {
    scanned: false,
    code: QrCode,
} | {
    scanned: true,
    code: QrCode,
    scan: QrCodeScan
}

export type Progress = Array<{
    team: Team,
    scans: Array<Scanned>
}>;

export type Dashboard = {
    game: Game,
    progress: Progress,
}
