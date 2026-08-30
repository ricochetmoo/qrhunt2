import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { game_players, games, qr_codes } from "@/db/schema";
import type { Game, GamePlayer, QrCode } from "@/db/types";
import { isJoinable, isPlayerVisible } from "@/lib/game-status";
import { normalizeRouteCode } from "@/lib/hint-crypto";
import type { JoinGameInput } from "@/lib/player-schemas";

import { generateId } from "./codes";
import { DomainError, isUniqueViolation } from "./errors";
import { findTeamByCode, joinTeam } from "./teams";

export type JoinedVia = "game_code" | "route_qr" | "team_code";

/**
 * QR payload format (decision): posters encode `${NEXT_PUBLIC_APP_URL}/s/<code>`.
 * Accept that URL, any URL with a `code` query parameter, or the bare code, so
 * the poster format can change without breaking older prints.
 */
export function extractRouteCode(payload: string): string {
  const trimmed = payload.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const fromQuery = url.searchParams.get("code");

      if (fromQuery) {
        return fromQuery.trim();
      }

      const segments = url.pathname.split("/").filter(Boolean);

      return segments[segments.length - 1] ?? "";
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

export async function findGameByCode(gameCode: string): Promise<Game | undefined> {
  const [game] = await db.select().from(games).where(eq(games.gameCode, gameCode)).limit(1);

  return game;
}

/** Resolve a route QR payload to its game (case-insensitive on the code). */
export async function findGameByRouteCode(
  payload: string,
): Promise<{ game: Game; qrCode: QrCode } | undefined> {
  const code = normalizeRouteCode(extractRouteCode(payload));

  if (!code) {
    return undefined;
  }

  const [row] = await db
    .select({ game: games, qrCode: qr_codes })
    .from(qr_codes)
    .innerJoin(games, eq(qr_codes.gameId, games.id))
    .where(sql`lower(${qr_codes.code}) = ${code}`)
    .limit(1);

  return row;
}

export async function getGamePlayer(gameId: string, userId: string): Promise<GamePlayer | undefined> {
  const [player] = await db
    .select()
    .from(game_players)
    .where(and(eq(game_players.gameId, gameId), eq(game_players.userId, userId)))
    .limit(1);

  return player;
}

/** Idempotently record that the user has joined the game. */
export async function ensureGamePlayer(
  gameId: string,
  userId: string,
  joinedVia: JoinedVia,
): Promise<GamePlayer> {
  const existing = await getGamePlayer(gameId, userId);

  if (existing) {
    return existing;
  }

  try {
    const [created] = await db
      .insert(game_players)
      .values({ id: generateId(), gameId, userId, joinedVia })
      .returning();

    return created;
  } catch (error) {
    // Two devices joining at once: the row now exists.
    if (isUniqueViolation(error)) {
      return (await getGamePlayer(gameId, userId))!;
    }

    throw error;
  }
}

/** The game, if players are allowed to see it at all. */
export async function requireVisibleGame(gameId: string): Promise<Game> {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);

  if (!game || !isPlayerVisible(game.status)) {
    throw new DomainError("GAME_UNAVAILABLE", "This game is not available.");
  }

  return game;
}

/** The game plus proof that the user has joined it. */
export async function requireGamePlayer(
  gameId: string,
  userId: string,
): Promise<{ game: Game; player: GamePlayer }> {
  const game = await requireVisibleGame(gameId);
  const player = await getGamePlayer(gameId, userId);

  if (!player) {
    throw new DomainError("NOT_IN_GAME", "Join the game with its code first.");
  }

  return { game, player };
}

function assertJoinable(game: Game) {
  if (!isJoinable(game.status)) {
    throw new DomainError(
      "GAME_NOT_JOINABLE",
      game.status === "finished" ? "This game has finished." : "This game is not open for players yet.",
    );
  }
}

function assertSelfSignup(game: Game) {
  if (!game.allowSelfSignup) {
    throw new DomainError(
      "SELF_SIGNUP_DISABLED",
      "This game does not allow players to sign up themselves. Ask an organiser for a team code.",
    );
  }
}

/**
 * Join a game by game code, route QR payload, or team code. Returns the game
 * id; callers fetch the aggregate player state afterwards. Re-joining a game
 * the user is already in is a no-op.
 */
export async function joinGame(userId: string, input: JoinGameInput): Promise<{ gameId: string }> {
  if (input.teamCode) {
    const team = await findTeamByCode(input.teamCode);

    if (!team) {
      throw new DomainError("NOT_FOUND", "No team has that code.");
    }

    const game = await requireVisibleGame(team.gameId);

    if (!(await getGamePlayer(game.id, userId))) {
      assertJoinable(game);
      await ensureGamePlayer(game.id, userId, "team_code");
    }

    // A team code is an invitation, so self-sign-up rules do not apply.
    await joinTeam(game, team, userId);

    return { gameId: game.id };
  }

  let game: Game | undefined;
  let via: JoinedVia;

  if (input.qrCode) {
    const match = await findGameByRouteCode(input.qrCode);

    if (!match) {
      throw new DomainError("NOT_FOUND", "That QR code is not part of a game.");
    }

    game = match.game;
    via = "route_qr";
  } else {
    game = await findGameByCode(input.gameCode!);
    via = "game_code";
  }

  if (!game || !isPlayerVisible(game.status)) {
    throw new DomainError("NOT_FOUND", "No game has that code.");
  }

  if (await getGamePlayer(game.id, userId)) {
    return { gameId: game.id };
  }

  assertJoinable(game);
  assertSelfSignup(game);

  if (via === "route_qr" && !game.routeSignupEnabled) {
    throw new DomainError(
      "ROUTE_SIGNUP_DISABLED",
      "You cannot join this game from a poster. Enter the game code instead.",
    );
  }

  await ensureGamePlayer(game.id, userId, via);

  return { gameId: game.id };
}
