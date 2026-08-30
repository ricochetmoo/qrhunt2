import type { Game, QrCode, QrCodeScan, Team } from "@/db/schema";
import type { Dashboard } from "@/server/admin/dashboard/types";
import {groupScansByTeam} from "@/server/admin/dashboard/groupScansByTeam";

export interface DashboardRepository {
  getGame(id: string): Promise<Game | undefined>;
  getTeams(gameId: string): Promise<Team[]>;
  getQrCodes(gameId: string): Promise<QrCode[]>;
  getScans(gameId: string): Promise<QrCodeScan[]>;
}

export async function getForGame(
  gameId: string,
  repository: DashboardRepository,
): Promise<Dashboard> {
  const game = await repository.getGame(gameId);

  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  const teams = await repository.getTeams(gameId);
  const qrCodes = await repository.getQrCodes(gameId);
  const scans = await repository.getScans(gameId);

  const scansByTeam = groupScansByTeam(scans);

  const progress = teams.map((team) => {
    const scansByCode = scansByTeam.get(team.id) ?? new Map<string, QrCodeScan>();

    return {
      team,
      scans: qrCodes.map((code) => {
        const scan = scansByCode.get(code.id);
        return scan
          ? ({ scanned: true as const, code, scan })
          : ({ scanned: false as const, code });
      }),
    };
  });

  return { game, progress };
}
