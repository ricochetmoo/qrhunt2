import { createMiddleware } from "hono/factory";

import {
  requireAdminGameRequest,
  requireAdminRequest,
} from "@/server/auth/require-admin-request";
import type { AdminPrincipal } from "@/server/auth/admin-principal";

export type AdminMiddlewareEnv = {
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
  const gameId = c.req.param("gameId");

  const result = gameId
    ? await requireAdminGameRequest(c.req.raw, gameId)
    : await requireAdminRequest(c.req.raw);

  if (!result.ok) {
    return result.response;
  }

  c.set("adminPrincipal", result.principal);
  await next();
});
