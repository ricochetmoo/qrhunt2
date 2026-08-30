import { createMiddleware } from "hono/factory";

export type PlayerUser = {
  id: string;
  name: string;
  email: string;
  isAnonymous: boolean;
};

export type PlayerEnv = { Variables: { user: PlayerUser } };

/**
 * Gate for `/api/player/*`: requires a Better Auth session. Players normally
 * sign in anonymously first (`POST /api/auth/sign-in/anonymous`); registered
 * users may play too. Game/team authorization is checked per request in the
 * domain services, never from client-supplied identity.
 */
export const requirePlayer = createMiddleware<PlayerEnv>(async (c, next) => {
  // Dynamic import keeps the server-only auth module out of the client type graph.
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: "Sign in first (anonymous sign-in is fine).", code: "UNAUTHORIZED" }, 401);
  }

  c.set("user", {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    isAnonymous: Boolean(session.user.isAnonymous),
  });

  await next();
});
