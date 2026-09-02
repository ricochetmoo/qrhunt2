import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { games, qr_codes } from "@/db/schema";
import type { Game, QrCode, Team } from "@/db/types";
import { isJoinable, isPlayerVisible } from "@/lib/game-status";
import { normalizeRouteCode } from "@/lib/hint-crypto";
import type { JoinGameInput } from "@/lib/player-schemas";

import { DomainError } from "./errors";
import { findTeamByCode, joinTeam } from "./teams";

/**
 * Game membership model: there is no player-game table. A player's persistent
 * link to a game is their team membership (`team_memberships` → `teams`).
 * Joining with a game/QR code is a stateless lookup that returns a one-shot
 * preview; joining with a team code enrols via the team. Team creation proves
 * capability by re-presenting the game code (see routes/player.ts).
 */

/**
 * QR payload format (decision): posters encode the app's production URL plus
 * `/s/<code>`.
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
    // Spares (inactive codes) cannot be used to find or join a game.
    .where(and(sql`lower(${qr_codes.code}) = ${code}`, eq(qr_codes.isActive, true)))
    .limit(1);

  return row;
}

/** The game, if players are allowed to see it at all. */
export async function requireVisibleGame(gameId: string): Promise<Game> {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);

  if (!game || !isPlayerVisible(game.status)) {
    throw new DomainError("GAME_UNAVAILABLE", "This game is not available.");
  }

  return game;
}

export function assertJoinable(game: Game) {
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

export type JoinResult = { game: Game; team: Team | null };

/**
 * Join by game code, route QR payload, or team code.
 *
 * - Game/QR codes are validated (lifecycle, self-sign-up, route-sign-up) and
 *   return the game with no team; nothing is persisted. The client proceeds to
 *   create or join a team, which is what enrols the player.
 * - A team code is an invitation: it enrols the player into that team (and
 *   therefore the game) immediately.
 */
export async function joinGame(userId: string, input: JoinGameInput): Promise<JoinResult> {
  if (input.teamCode) {
    const team = await findTeamByCode(input.teamCode);

    if (!team) {
      throw new DomainError("NOT_FOUND", "No team has that code.");
    }

    const game = await requireVisibleGame(team.gameId);
    const joined = await joinTeam(game, team, userId);

    return { game, team: joined };
  }

  let game: Game | undefined;

  if (input.qrCode) {
    const match = await findGameByRouteCode(input.qrCode);

    if (!match) {
      throw new DomainError("NOT_FOUND", "That QR code is not part of a game.");
    }

    game = match.game;

    if (isPlayerVisible(game.status) && !game.routeSignupEnabled) {
      throw new DomainError(
        "ROUTE_SIGNUP_DISABLED",
        "You cannot join this game from a poster. Enter the game code instead.",
      );
    }
  } else {
    game = await findGameByCode(input.gameCode!);
  }

  if (!game || !isPlayerVisible(game.status)) {
    throw new DomainError("NOT_FOUND", "No game has that code.");
  }

  assertJoinable(game);
  assertSelfSignup(game);

  return { game, team: null };
}
