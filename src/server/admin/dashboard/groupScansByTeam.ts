import {QrCodeScan} from "@/db/schema";

export function groupScansByTeam(
    scans: QrCodeScan[],
): Map<string, Map<string, QrCodeScan>> {
    return scans.reduce(
        (byTeam, scan) =>
            byTeam.set(
                scan.teamId,
                (byTeam.get(scan.teamId) ?? new Map()).set(scan.qrCodeId, scan),
            ),
        new Map<string, Map<string, QrCodeScan>>(),
    );
}
