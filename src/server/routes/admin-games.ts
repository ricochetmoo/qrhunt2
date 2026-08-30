import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import {
  createGameSchema,
  gameIdParamSchema,
  qrCodeInputSchema,
  qrCodeParamSchema,
  reorderQrCodesSchema,
  updateGameSchema,
  updateQrCodeSchema,
} from "@/lib/admin-schemas";
import { gameDashboard } from "@/server/api/gameDashboard";
import { domainErrorToResponse } from "@/server/domain/errors";
import {
  createGame,
  deleteGame,
  getGameWithRoute,
  listGames,
  regenerateGameCode,
  updateGame,
} from "@/server/domain/games";
import {
  createQrCode,
  deleteQrCode,
  listQrCodes,
  reorderQrCodes,
  updateQrCode,
} from "@/server/domain/qr-codes";
import { requireAdmin } from "@/server/middleware/require-admin";

/**
 * Admin game management. Mounted at `/api/admin/games` from `src/server/api.ts`.
 * Kept as one chained expression so the Hono RPC types flow into `AppType`.
 */
export const adminGamesRoute = new Hono()
  .use("*", requireAdmin)
  .get("/", async (c) => c.json({ games: await listGames() }))
  .post("/", zValidator("json", createGameSchema), async (c) => {
    const game = await createGame(c.req.valid("json"));

    return c.json({ game }, 201);
  })
  .get("/:gameId", zValidator("param", gameIdParamSchema), async (c) => {
    const result = await getGameWithRoute(c.req.valid("param").gameId);

    if (!result) {
      return c.json({ error: "Game not found.", code: "NOT_FOUND" }, 404);
    }

    return c.json(result);
  })
  .get("/:gameId/dashboard", zValidator("param", gameIdParamSchema), gameDashboard)
  .patch(
    "/:gameId",
    zValidator("param", gameIdParamSchema),
    zValidator("json", updateGameSchema),
    async (c) => {
      try {
        const game = await updateGame(c.req.valid("param").gameId, c.req.valid("json"));

        return c.json({ game });
      } catch (error) {
        return domainErrorToResponse(c, error);
      }
    },
  )
  .post("/:gameId/game-code", zValidator("param", gameIdParamSchema), async (c) => {
    try {
      const game = await regenerateGameCode(c.req.valid("param").gameId);

      return c.json({ game });
    } catch (error) {
      return domainErrorToResponse(c, error);
    }
  })
  .delete("/:gameId", zValidator("param", gameIdParamSchema), async (c) => {
    const deleted = await deleteGame(c.req.valid("param").gameId);

    if (!deleted) {
      return c.json({ error: "Game not found.", code: "NOT_FOUND" }, 404);
    }

    return c.body(null, 204);
  })
  .get("/:gameId/qr-codes", zValidator("param", gameIdParamSchema), async (c) =>
    c.json({ qrCodes: await listQrCodes(c.req.valid("param").gameId) }),
  )
  .post(
    "/:gameId/qr-codes",
    zValidator("param", gameIdParamSchema),
    zValidator("json", qrCodeInputSchema),
    async (c) => {
      try {
        const qrCode = await createQrCode(c.req.valid("param").gameId, c.req.valid("json"));

        return c.json({ qrCode }, 201);
      } catch (error) {
        return domainErrorToResponse(c, error);
      }
    },
  )
  .patch(
    "/:gameId/qr-codes/:qrCodeId",
    zValidator("param", qrCodeParamSchema),
    zValidator("json", updateQrCodeSchema),
    async (c) => {
      const { gameId, qrCodeId } = c.req.valid("param");

      try {
        const qrCode = await updateQrCode(gameId, qrCodeId, c.req.valid("json"));

        return c.json({ qrCode });
      } catch (error) {
        return domainErrorToResponse(c, error);
      }
    },
  )
  .delete("/:gameId/qr-codes/:qrCodeId", zValidator("param", qrCodeParamSchema), async (c) => {
    const { gameId, qrCodeId } = c.req.valid("param");

    try {
      const qrCodes = await deleteQrCode(gameId, qrCodeId);

      return c.json({ qrCodes });
    } catch (error) {
      return domainErrorToResponse(c, error);
    }
  })
  .put(
    "/:gameId/route/order",
    zValidator("param", gameIdParamSchema),
    zValidator("json", reorderQrCodesSchema),
    async (c) => {
      try {
        const qrCodes = await reorderQrCodes(
          c.req.valid("param").gameId,
          c.req.valid("json").orderedIds,
        );

        return c.json({ qrCodes });
      } catch (error) {
        return domainErrorToResponse(c, error);
      }
    },
  );
