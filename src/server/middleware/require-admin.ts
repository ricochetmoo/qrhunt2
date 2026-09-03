import { createMiddleware } from "hono/factory";

/**
 * Gate for `/api/admin/*`.
 *
 * The admin auth instance has a separate cookie prefix, but it shares the
 * Better Auth user table with player auth. Resolve the persisted application
 * role as well as the session before allowing a request through.
 */
export const requireAdmin = createMiddleware(async (c, next) => {
  const { resolveAdminPrincipal } = await import("@/server/auth/admin-principal");
  const result = await resolveAdminPrincipal(c.req.raw.headers);

  if (result.status === "unauthenticated") {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (result.status === "forbidden") {
    return c.json({ error: "Forbidden" }, 403);
  }

  await next();
});
