import { createMiddleware } from "hono/factory";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema";

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
  // Local seeded play has no Better Auth browser session. Keep this escape
  // hatch explicit, database-backed, and impossible to activate in production.
  const mockPlayerEmail = process.env.MOCK_PLAYER_EMAIL?.trim();
  if (process.env.NODE_ENV !== "production" && mockPlayerEmail) {
    const [mockPlayer] = await db
      .select({ id: user.id, name: user.name, email: user.email, isAnonymous: user.isAnonymous })
      .from(user)
      .where(eq(user.email, mockPlayerEmail))
      .limit(1);

    if (!mockPlayer) {
      return c.json(
        {
          error: `No seeded player exists for MOCK_PLAYER_EMAIL (${mockPlayerEmail}).`,
          code: "MOCK_PLAYER_NOT_FOUND",
        },
        401,
      );
    }

    c.set("user", {
      id: mockPlayer.id,
      name: mockPlayer.name,
      email: mockPlayer.email,
      isAnonymous: mockPlayer.isAnonymous,
    });
    await next();
    return;
  }

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
