import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { type Game, game_admins, games } from "@/db/schema";

export async function gameExists(gameId: string): Promise<boolean> {
  const rows = await db
    .select({ id: games.id })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);

  return rows.length > 0;
}

/**
 * Returns the game row when `userId` has a `game_admins` membership for it.
 * A `null` result does not distinguish "no such game" from "not an admin";
 * callers that need a 404 vs 403 split should follow up with `gameExists`.
 */
export async function getGameForAdmin(
  userId: string,
  gameId: string,
): Promise<Game | null> {
  const rows = await db
    .select({ game: games })
    .from(games)
    .innerJoin(game_admins, eq(game_admins.gameId, games.id))
    .where(and(eq(games.id, gameId), eq(game_admins.userId, userId)))
    .limit(1);

  return rows[0]?.game ?? null;
}
