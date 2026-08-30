import { createMiddleware } from "hono/factory";

/**
 * Gate for `/api/admin/*`.
 *
 * TODO(auth): resolve the Better Auth session via
 * `auth.api.getSession({ headers: c.req.raw.headers })` (dynamic import, as in
 * `/api/me`), reject anonymous users, and when a `gameId` param is present
 * check for a matching `game_admins` row. Intentionally a no-op for now — the
 * admin area is open during early development.
 */
export const requireAdmin = createMiddleware(async (_c, next) => {
  await next();
});
