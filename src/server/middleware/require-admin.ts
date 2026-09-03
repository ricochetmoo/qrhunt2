import { createMiddleware } from "hono/factory";

import type { AdminPrincipal } from "@/server/auth/admin-principal";

type AdminMiddlewareEnv = {
  Variables: {
    adminPrincipal: AdminPrincipal;
  };
};

/**
 * Gate for `/api/admin/*`.
 *
 * The admin auth instance has a separate cookie prefix, but it shares the
 * Better Auth user table with player auth. Resolve the persisted application
 * role as well as the session before allowing a request through.
 */
export const requireAdmin = createMiddleware<AdminMiddlewareEnv>(async (c, next) => {
  const { resolveAdminPrincipal } = await import("@/server/auth/admin-principal");
  const result = await resolveAdminPrincipal(c.req.raw.headers);

  if (result.status === "unauthenticated") {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (result.status === "forbidden") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const gameId = c.req.param("gameId");

  if (gameId) {
    const { getGameForAdmin } = await import("@/server/games/access");
    const game = await getGameForAdmin(result.principal.userId, gameId);

    if (!game) {
      return c.json({ error: "Game not found.", code: "NOT_FOUND" }, 404);
    }
  }

  c.set("adminPrincipal", result.principal);
  await next();
});
