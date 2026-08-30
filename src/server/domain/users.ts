import "server-only";

import { count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { games, team_memberships, teams, user } from "@/db/schema";

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
