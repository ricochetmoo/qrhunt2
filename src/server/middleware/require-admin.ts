import { createMiddleware } from "hono/factory";

/**
 * Gate for `/api/admin/*`.
 *
 * The admin auth instance has a separate cookie prefix and does not enable
 * Better Auth's anonymous plugin, so a valid session here is an administrator
 * session rather than a player session.
 */
export const requireAdmin = createMiddleware(async (c, next) => {
  const { adminAuth } = await import("@/lib/admin-auth");
  const session = await adminAuth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
});
