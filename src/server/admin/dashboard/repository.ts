import "server-only";

import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { games, qr_codes, qr_code_scans, teams } from "@/db/schema";
import { type DashboardRepository } from "./getForGame";

export const drizzleDashboardRepository: DashboardRepository = {
  getGame(id) {
    return db.query.games.findFirst({ where: eq(games.id, id) });
  },
  getTeams(gameId) {
    return db.query.teams.findMany({ where: eq(teams.gameId, gameId) });
  },
  getQrCodes(gameId) {
    return db.query.qr_codes.findMany({ where: eq(qr_codes.gameId, gameId) });
  },
  getScans(gameId) {
    return db.query.qr_code_scans.findMany({
      where: inArray(
        qr_code_scans.teamId,
        db.select({ id: teams.id }).from(teams).where(eq(teams.gameId, gameId)),
      ),
    });
  },
};
