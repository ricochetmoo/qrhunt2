import type { Game, QrCode, QrCodeScan, Team } from "@/db/schema";
import type { Dashboard } from "@/server/admin/dashboard/types";
import {groupScansByTeam} from "@/server/admin/dashboard/groupScansByTeam";

export interface DashboardMember {
  teamId: string;
  userId: string;
  userName: string;
}

export interface DashboardRepository {
  getGame(id: string): Promise<Game | undefined>;
  getTeams(gameId: string): Promise<Team[]>;
  getQrCodes(gameId: string): Promise<QrCode[]>;
  getScans(gameId: string): Promise<QrCodeScan[]>;
  getMembers(gameId: string): Promise<DashboardMember[]>;
}

export async function getForGame(
  gameId: string,
  repository: DashboardRepository,
): Promise<Dashboard> {
  const game = await repository.getGame(gameId);

  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  const [teams, qrCodes, scans, members] = await Promise.all([
    repository.getTeams(gameId),
    repository.getQrCodes(gameId),
    repository.getScans(gameId),
    repository.getMembers(gameId),
  ]);

  const scansByTeam = groupScansByTeam(scans);

  const memberCountByTeam = new Map<string, number>();
  const userNameByUserId = new Map<string, string>();
  for (const member of members) {
    memberCountByTeam.set(member.teamId, (memberCountByTeam.get(member.teamId) ?? 0) + 1);
    if (!userNameByUserId.has(member.userId)) {
      userNameByUserId.set(member.userId, member.userName);
    }
  }

  const progress = teams.map((team) => {
    const scansByCode = scansByTeam.get(team.id) ?? new Map<string, QrCodeScan>();

    return {
      team,
      memberCount: memberCountByTeam.get(team.id) ?? 0,
      scans: qrCodes.map((code) => {
        const scan = scansByCode.get(code.id);
        return scan
          ? ({
              scanned: true as const,
              code,
              scan,
              userName: userNameByUserId.get(scan.userId) ?? null,
            })
          : ({ scanned: false as const, code });
      }),
    };
  });

  return { game, route: qrCodes, serverTime: new Date().toISOString(), progress };
}
