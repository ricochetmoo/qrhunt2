import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { games, qr_codes, qr_code_scans, team_memberships, teams, user } from "@/db/schema";
import { type DashboardRepository } from "./getForGame";

export const drizzleDashboardRepository: DashboardRepository = {
  getGame(id) {
    return db.query.games.findFirst({ where: eq(games.id, id) });
  },
  getTeams(gameId) {
    return db.query.teams.findMany({ where: eq(teams.gameId, gameId) });
  },
  getQrCodes(gameId) {
    // Spares (inactive codes) and the completion code are not checkpoints, so
    // they are left out of the progress matrix and totals.
    return db
      .select()
      .from(qr_codes)
      .where(
        and(
          eq(qr_codes.gameId, gameId),
          eq(qr_codes.isActive, true),
          eq(qr_codes.isCompletion, false),
        ),
      )
      .orderBy(asc(qr_codes.sortOrder), asc(qr_codes.createdAt));
  },
  getScans(gameId) {
    return db.query.qr_code_scans.findMany({
      where: inArray(
        qr_code_scans.teamId,
        db.select({ id: teams.id }).from(teams).where(eq(teams.gameId, gameId)),
      ),
    });
  },
  getMembers(gameId) {
    return db
      .select({
        teamId: team_memberships.teamId,
        userId: team_memberships.userId,
        userName: user.name,
      })
      .from(team_memberships)
      .innerJoin(teams, eq(teams.id, team_memberships.teamId))
      .innerJoin(user, eq(user.id, team_memberships.userId))
      .where(eq(teams.gameId, gameId));
  },
};
