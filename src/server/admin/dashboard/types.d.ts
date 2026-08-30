import {Game, QrCode, QrCodeScan, Team} from "@/db/schema";

export type Scanned = {
    scanned: false,
    code: QrCode,
} | {
    scanned: true,
    code: QrCode,
    scan: QrCodeScan,
    userName: string | null,
}

export type TeamProgress = {
    team: Team,
    memberCount: number,
    scans: Array<Scanned>,
};

export type Progress = Array<TeamProgress>;

export type Dashboard = {
    game: Game,
    route: Array<QrCode>,
    serverTime: string,
    progress: Progress,
}
