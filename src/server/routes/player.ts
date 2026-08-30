import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import {
  joinGameSchema,
  playerGameIdParamSchema,
  playerTeamIdParamSchema,
  syncScansSchema,
  teamActionSchema,
  updateTeamSchema,
} from "@/lib/player-schemas";
import { DomainError, domainErrorToResponse } from "@/server/domain/errors";
import { getPlayerState } from "@/server/domain/player-state";
import { joinGame, requireGamePlayer } from "@/server/domain/players";
import { listQrCodes } from "@/server/domain/qr-codes";
import { splitRoute } from "@/server/domain/route-bundle";
import { syncScans } from "@/server/domain/scans";
import { createTeam, findTeamByCode, getTeamForUser, joinTeam, updateTeam } from "@/server/domain/teams";
import { requirePlayer, type PlayerEnv } from "@/server/middleware/require-player";

/**
 * Player API (AGENTS.md "Minimal custom API contract"). Mounted at `/api/player`.
 * Every response that changes state also returns the full aggregate `state`
 * so the client needs no follow-up round-trip.
 */
export const playerRoute = new Hono<PlayerEnv>()
  .use("*", requirePlayer)
  .post("/join", zValidator("json", joinGameSchema), async (c) => {
    const user = c.get("user");

    try {
      const { gameId } = await joinGame(user.id, c.req.valid("json"));
      const state = await getPlayerState(gameId, user.id);

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
        const { game } = await requireGamePlayer(gameId, user.id);

        if (input.action === "create") {
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
        const { game } = await requireGamePlayer(gameId, user.id);
        const team = await getTeamForUser(gameId, user.id);

        if (!team) {
          throw new DomainError("NOT_IN_TEAM", "Create or join a team before scanning.");
        }

        const { route, wildcard } = splitRoute(await listQrCodes(gameId));
        const { outcomes } = await syncScans({ game, team, userId: user.id, route, wildcard, scans });
        const state = await getPlayerState(gameId, user.id);

        return c.json({ results: outcomes, state });
      } catch (error) {
        return domainErrorToResponse(c, error);
      }
    },
  );
