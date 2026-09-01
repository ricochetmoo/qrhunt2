import "server-only";

import { and, count, countDistinct, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { game_admins, games, qr_code_scans, qr_codes, team_memberships, teams, user } from "@/db/schema";
import { CREDITED_SCAN_RESULTS } from "@/lib/scan-results";

export const USERS_PAGE_SIZE = 25;
export const RECENT_USERS_LIMIT = 10;

export type AdminUserTeam = {
  teamId: string;
  teamName: string;
  gameId: string;
  gameName: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  isAnonymous: boolean;
  createdAt: Date;
  teams: AdminUserTeam[];
};

export type UsersPage = {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  query: string;
};

const userColumns = {
  id: user.id,
  name: user.name,
  email: user.email,
  isAnonymous: user.isAnonymous,
  createdAt: user.createdAt,
};

/** Escape LIKE wildcards so a search for "%" or "_" matches literally. */
function likePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

function searchFilter(query: string): SQL | undefined {
  const trimmed = query.trim();

  if (!trimmed) {
    return undefined;
  }

  const pattern = likePattern(trimmed);

  return or(ilike(user.name, pattern), ilike(user.email, pattern));
}

async function attachTeams(rows: Omit<AdminUser, "teams">[]): Promise<AdminUser[]> {
  if (rows.length === 0) {
    return [];
  }

  const memberships = await db
    .select({
      userId: team_memberships.userId,
      teamId: teams.id,
      teamName: teams.name,
      gameId: games.id,
      gameName: games.name,
    })
    .from(team_memberships)
    .innerJoin(teams, eq(team_memberships.teamId, teams.id))
    .innerJoin(games, eq(teams.gameId, games.id))
    .where(
      inArray(
        team_memberships.userId,
        rows.map((row) => row.id),
      ),
    );

  const byUser = new Map<string, AdminUserTeam[]>();

  for (const { userId, ...team } of memberships) {
    const list = byUser.get(userId) ?? [];
    list.push(team);
    byUser.set(userId, list);
  }

  return rows.map((row) => ({ ...row, teams: byUser.get(row.id) ?? [] }));
}

/** Most recent sign-ups, newest first. */
export async function listRecentUsers(limit = RECENT_USERS_LIMIT): Promise<AdminUser[]> {
  const rows = await db
    .select(userColumns)
    .from(user)
    .orderBy(desc(user.createdAt), desc(user.id))
    .limit(limit);

  return attachTeams(rows);
}

/** Paged, searchable list of all users (name or email), newest first. */
export async function searchUsers(options: {
  query?: string;
  page?: number;
  pageSize?: number;
}): Promise<UsersPage> {
  const query = options.query?.trim() ?? "";
  const pageSize = Math.min(Math.max(options.pageSize ?? USERS_PAGE_SIZE, 1), 100);
  const where = searchFilter(query);

  const [{ total }] = await db.select({ total: count() }).from(user).where(where);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(options.page ?? 1, 1), pageCount);

  const rows = await db
    .select(userColumns)
    .from(user)
    .where(where)
    .orderBy(desc(user.createdAt), desc(user.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    users: await attachTeams(rows),
    total,
    page,
    pageSize,
    pageCount,
    query,
  };
}

// ---------------------------------------------------------------------------
// User detail

export type UserScanSummary = {
  scanId: string;
  qrCodeId: string;
  qrCodeName: string;
  qrCodeCode: string;
  scannedAt: Date;
};

export type UserGameEngagement = {
  game: { id: string; name: string; status: string };
  team: { id: string; name: string; joinedAt: Date; memberCount: number };
  route: { totalCodes: number; teamCodesScanned: number };
  userScans: { total: number; last: UserScanSummary | null };
  teamScans: { total: number; last: UserScanSummary | null };
};

export type AdminUserDetail = {
  account: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    isAnonymous: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  adminOf: { id: string; name: string; status: string }[];
  engagements: UserGameEngagement[];
};

const scanSummaryColumns = {
  scanId: qr_code_scans.id,
  qrCodeId: qr_codes.id,
  qrCodeName: qr_codes.name,
  qrCodeCode: qr_codes.code,
  scannedAt: qr_code_scans.createdAt,
};

async function lastScan(where: SQL): Promise<UserScanSummary | null> {
  const [row] = await db
    .select(scanSummaryColumns)
    .from(qr_code_scans)
    .innerJoin(qr_codes, eq(qr_code_scans.qrCodeId, qr_codes.id))
    .where(where)
    .orderBy(desc(qr_code_scans.createdAt), desc(qr_code_scans.id))
    .limit(1);

  return row ?? null;
}

async function countWhere(where: SQL): Promise<number> {
  const [row] = await db.select({ total: count() }).from(qr_code_scans).where(where);

  return row.total;
}

export async function getUserDetail(userId: string): Promise<AdminUserDetail | undefined> {
  const [account] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      isAnonymous: user.isAnonymous,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!account) {
    return undefined;
  }

  const [adminOf, memberships] = await Promise.all([
    db
      .select({ id: games.id, name: games.name, status: games.status })
      .from(game_admins)
      .innerJoin(games, eq(game_admins.gameId, games.id))
      .where(eq(game_admins.userId, userId))
      .orderBy(desc(games.updatedAt)),
    db
      .select({
        gameId: games.id,
        gameName: games.name,
        gameStatus: games.status,
        teamId: teams.id,
        teamName: teams.name,
        joinedAt: team_memberships.createdAt,
      })
      .from(team_memberships)
      .innerJoin(teams, eq(team_memberships.teamId, teams.id))
      .innerJoin(games, eq(teams.gameId, games.id))
      .where(eq(team_memberships.userId, userId))
      .orderBy(desc(team_memberships.createdAt)),
  ]);

  const engagements = await Promise.all(
    memberships.map(async (m): Promise<UserGameEngagement> => {
      // Only credited scans (accepted route codes and the wildcard) count here;
      // rejected attempts are kept for audit but are not "scans" to the admin.
      const credited = inArray(qr_code_scans.result, [...CREDITED_SCAN_RESULTS]);
      const userScanWhere = and(
        eq(qr_code_scans.userId, userId),
        eq(qr_code_scans.teamId, m.teamId),
        credited,
      )!;
      const teamScanWhere = and(eq(qr_code_scans.teamId, m.teamId), credited)!;

      const [
        [{ memberCount }],
        [{ totalCodes }],
        [{ teamCodesScanned }],
        userTotal,
        userLast,
        teamTotal,
        teamLast,
      ] = await Promise.all([
        db
          .select({ memberCount: count() })
          .from(team_memberships)
          .where(eq(team_memberships.teamId, m.teamId)),
        db
          .select({ totalCodes: count() })
          .from(qr_codes)
          .where(and(eq(qr_codes.gameId, m.gameId), eq(qr_codes.isWildcard, false))),
        db
          .select({ teamCodesScanned: countDistinct(qr_code_scans.qrCodeId) })
          .from(qr_code_scans)
          .where(and(eq(qr_code_scans.teamId, m.teamId), eq(qr_code_scans.result, "accepted"))),
        countWhere(userScanWhere),
        lastScan(userScanWhere),
        countWhere(teamScanWhere),
        lastScan(teamScanWhere),
      ]);

      return {
        game: { id: m.gameId, name: m.gameName, status: m.gameStatus },
        team: { id: m.teamId, name: m.teamName, joinedAt: m.joinedAt, memberCount },
        route: { totalCodes, teamCodesScanned },
        userScans: { total: userTotal, last: userLast },
        teamScans: { total: teamTotal, last: teamLast },
      };
    }),
  );

  return { account, adminOf, engagements };
}
