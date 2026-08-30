import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { z } from "zod";

import { isJoinable, isPlayerVisible } from "@/lib/game-status";
import {
  joinGameSchema,
  playerGameIdParamSchema,
  playerTeamIdParamSchema,
  syncScansSchema,
  teamActionSchema,
  updatePlayerMeSchema,
  updateTeamSchema,
} from "@/lib/player-schemas";
import { DomainError, domainErrorToResponse } from "@/server/domain/errors";
import { getGamePreview, getPlayerState, requireTeamMember } from "@/server/domain/player-state";
import {
  assertJoinable,
  findGameByCode,
  findGameByRouteCode,
  joinGame,
  requireVisibleGame,
} from "@/server/domain/players";
import { listQrCodes } from "@/server/domain/qr-codes";
import { splitRoute } from "@/server/domain/route-bundle";
import { syncScans } from "@/server/domain/scans";
import { createTeam, findTeamByCode, getTeamForUser, joinTeam, updateTeam } from "@/server/domain/teams";
import { requirePlayer, type PlayerEnv } from "@/server/middleware/require-player";

/**
 * Player API (AGENTS.md "Minimal custom API contract"). Mounted at `/api/player`.
 *
 * Access model: team membership is the only persistent game membership.
 * `POST /join` with a game/QR code returns a one-shot preview (nothing
 * persisted, bundle fully locked); creating a team re-presents the game code;
 * a team code enrols directly. Every other endpoint requires membership.
 * Responses that change state also return the full aggregate `state`.
 */
/** Better Auth's anonymous plugin names fresh users "Anonymous". */
const ANONYMOUS_DEFAULT_NAME = "Anonymous";

const resolveParamSchema = z.object({ code: z.string().trim().min(1).max(2048) });

export const playerRoute = new Hono<PlayerEnv>()
  // Registered BEFORE requirePlayer on purpose: the /s/<code> funnel calls
  // this on load, possibly with no session yet. Read-only; reveals only what
  // the poster itself does (the game's name and join rules) plus the caller's
  // own enrolment.
  .get("/resolve/:code", zValidator("param", resolveParamSchema), async (c) => {
    const payload = c.req.valid("param").code;

    // A stop QR payload (8-char route code or poster URL) or, failing that,
    // the 6-char game join code — so /s/<gameCode> links work too.
    const match = await findGameByRouteCode(payload);
    const game = match?.game ?? (await findGameByCode(payload.trim().toUpperCase()));
    const kind = match ? ("stop" as const) : ("game" as const);

    if (!game || !isPlayerVisible(game.status)) {
      return c.json({ found: false as const });
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const team = session ? await getTeamForUser(game.id, session.user.id) : undefined;
    const name = session?.user.name?.trim() ?? "";

    return c.json({
      found: true as const,
      kind,
      game: {
        id: game.id,
        name: game.name,
        status: game.status,
        mode: game.gameMode,
        joinable: isJoinable(game.status),
        routeSignupEnabled: game.routeSignupEnabled,
        allowSelfSignup: game.allowSelfSignup,
      },
      stop: match ? { name: match.qrCode.name } : null,
      viewer: {
        signedIn: Boolean(session),
        named: Boolean(name) && name !== ANONYMOUS_DEFAULT_NAME,
        name: name || null,
        enrolled: Boolean(team),
        teamName: team?.name ?? null,
      },
    });
  })
  .use("*", requirePlayer)
  .patch("/me", zValidator("json", updatePlayerMeSchema), async (c) => {
    const { name } = c.req.valid("json");
    const { auth } = await import("@/lib/auth");

    await auth.api.updateUser({ headers: c.req.raw.headers, body: { name } });

    return c.json({ ok: true as const, name });
  })
  .post("/join", zValidator("json", joinGameSchema), async (c) => {
    const user = c.get("user");

    try {
      const { game, team } = await joinGame(user.id, c.req.valid("json"));
      const state = team ? await getPlayerState(game.id, user.id) : await getGamePreview(game, user.id);

      return c.json({ state });
    } catch (error) {
      return domainErrorToResponse(c, error);
    }
  })
  .get("/games/:gameId/state", zValidator("param", playerGameIdParamSchema), async (c) => {
    try {
      const state = await getPlayerState(c.req.valid("param").gameId, c.get("user").id);

      return c.json({ state });
    } catch (error) {
      return domainErrorToResponse(c, error);
    }
  })
  .post(
    "/games/:gameId/team",
    zValidator("param", playerGameIdParamSchema),
    zValidator("json", teamActionSchema),
    async (c) => {
      const user = c.get("user");
      const { gameId } = c.req.valid("param");
      const input = c.req.valid("json");

      try {
        const game = await requireVisibleGame(gameId);

        if (input.action === "create") {
          const viaGameCode = input.gameCode !== undefined && game.gameCode === input.gameCode;
          const viaQr =
            !viaGameCode &&
            input.qrCode !== undefined &&
            (await findGameByRouteCode(input.qrCode))?.game.id === game.id;

          if (!viaGameCode && !viaQr) {
            throw new DomainError("FORBIDDEN", "That code does not match this game.");
          }

          assertJoinable(game);
          await createTeam(game, user.id, input.name);
        } else {
          const team = await findTeamByCode(input.teamCode);

          if (!team || team.gameId !== game.id) {
            throw new DomainError("NOT_FOUND", "No team in this game has that code.");
          }

          await joinTeam(game, team, user.id);
        }

        const state = await getPlayerState(gameId, user.id);

        return c.json({ state }, 201);
      } catch (error) {
        return domainErrorToResponse(c, error);
      }
    },
  )
  .patch(
    "/teams/:teamId",
    zValidator("param", playerTeamIdParamSchema),
    zValidator("json", updateTeamSchema),
    async (c) => {
      const user = c.get("user");

      try {
        const { game } = await updateTeam(c.req.valid("param").teamId, user.id, c.req.valid("json"));
        const state = await getPlayerState(game.id, user.id);

        return c.json({ state });
      } catch (error) {
        return domainErrorToResponse(c, error);
      }
    },
  )
  .post(
    "/games/:gameId/scans/sync",
    zValidator("param", playerGameIdParamSchema),
    zValidator("json", syncScansSchema),
    async (c) => {
      const user = c.get("user");
      const { gameId } = c.req.valid("param");
      const { scans } = c.req.valid("json");

      try {
        const { game, team } = await requireTeamMember(gameId, user.id);
        const { route, wildcard } = splitRoute(await listQrCodes(gameId));
        const { outcomes } = await syncScans({ game, team, userId: user.id, route, wildcard, scans });
        const state = await getPlayerState(gameId, user.id);

        return c.json({ results: outcomes, state });
      } catch (error) {
        return domainErrorToResponse(c, error);
      }
    },
  );
