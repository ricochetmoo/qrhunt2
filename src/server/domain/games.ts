import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { games, qr_codes } from "@/db/schema";
import type { Game, QrCode } from "@/db/types";
import type { CreateGameInput, UpdateGameInput } from "@/lib/admin-schemas";
import { isGameStatus } from "@/lib/game-status";

import { generateGameCode, generateId } from "./codes";
import { DomainError, isUniqueViolation } from "./errors";
import { canTransition } from "./game-lifecycle";

const GAME_CODE_INSERT_ATTEMPTS = 3;

export async function listGames(): Promise<Game[]> {
  return db.select().from(games).orderBy(desc(games.updatedAt));
}

export async function getGame(gameId: string): Promise<Game | undefined> {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);

  return game;
}

export async function getGameWithRoute(
  gameId: string,
): Promise<{ game: Game; qrCodes: QrCode[] } | undefined> {
  const game = await getGame(gameId);

  if (!game) {
    return undefined;
  }

  const codes = await db
    .select()
    .from(qr_codes)
    .where(eq(qr_codes.gameId, gameId))
    .orderBy(asc(qr_codes.sortOrder), asc(qr_codes.createdAt));

  return { game, qrCodes: codes };
}

export async function createGame(input: CreateGameInput): Promise<Game> {
  for (let attempt = 1; ; attempt++) {
    try {
      const [game] = await db
        .insert(games)
        .values({ id: generateId(), name: input.name, status: "draft", gameCode: generateGameCode() })
        .returning();

      return game;
    } catch (error) {
      // Regenerate on the (unlikely) game-code collision.
      if (!isUniqueViolation(error) || attempt >= GAME_CODE_INSERT_ATTEMPTS) {
        throw error;
      }
    }
  }
}

/** Issue a fresh join code, e.g. if the old one leaked. */
export async function regenerateGameCode(gameId: string): Promise<Game> {
  for (let attempt = 1; ; attempt++) {
    try {
      const [game] = await db
        .update(games)
        .set({ gameCode: generateGameCode(), updatedAt: new Date() })
        .where(eq(games.id, gameId))
        .returning();

      if (!game) {
        throw new DomainError("NOT_FOUND", "Game not found.");
      }

      return game;
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= GAME_CODE_INSERT_ATTEMPTS) {
        throw error;
      }
    }
  }
}

export async function updateGame(gameId: string, patch: UpdateGameInput): Promise<Game> {
  const current = await getGame(gameId);

  if (!current) {
    throw new DomainError("NOT_FOUND", "Game not found.");
  }

  const nextStatus = patch.status ?? current.status;

  if (
    patch.status !== undefined &&
    isGameStatus(current.status) &&
    !canTransition(current.status, patch.status)
  ) {
    throw new DomainError(
      "INVALID_TRANSITION",
      `Cannot move a game from ${current.status} to ${patch.status}.`,
    );
  }

  // A pause reason only makes sense while paused.
  const pauseReason =
    nextStatus === "paused"
      ? (patch.pauseReason === undefined ? current.pauseReason : patch.pauseReason)
      : null;

  const wildcardEnabled = patch.wildcardEnabled ?? current.wildcardEnabled;
  const wildcardName =
    patch.wildcardName === undefined ? current.wildcardName : patch.wildcardName;

  if (wildcardEnabled && !wildcardName) {
    throw new DomainError("VALIDATION", "Give the wildcard a name when it is enabled.");
  }

  const [game] = await db
    .update(games)
    .set({
      name: patch.name ?? current.name,
      status: nextStatus,
      pauseReason: pauseReason || null,
      // Remember the first time the game started/finished for timing and leaderboards.
      startedAt: current.startedAt ?? (nextStatus === "started" ? new Date() : null),
      finishedAt: current.finishedAt ?? (nextStatus === "finished" ? new Date() : null),
      allowSelfSignup: patch.allowSelfSignup ?? current.allowSelfSignup,
      allowTeamCreation: patch.allowTeamCreation ?? current.allowTeamCreation,
      allowTeamNames: patch.allowTeamNames ?? current.allowTeamNames,
      allowTeamPhotos: patch.allowTeamPhotos ?? current.allowTeamPhotos,
      routeSignupEnabled: patch.routeSignupEnabled ?? current.routeSignupEnabled,
      wildcardEnabled,
      wildcardName,
      staggeredStart: patch.staggeredStart ?? current.staggeredStart,
      qrRemoveBy:
        patch.qrRemoveBy === undefined
          ? current.qrRemoveBy
          : patch.qrRemoveBy === null
            ? null
            : new Date(patch.qrRemoveBy),
      issueContactPhone:
        patch.issueContactPhone === undefined ? current.issueContactPhone : patch.issueContactPhone,
      updatedAt: new Date(),
    })
    .where(eq(games.id, gameId))
    .returning();

  return game;
}

/** Deletes the game; child rows cascade. Returns false if it did not exist. */
export async function deleteGame(gameId: string): Promise<boolean> {
  const deleted = await db.delete(games).where(eq(games.id, gameId)).returning({ id: games.id });

  return deleted.length > 0;
}
