import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { adminGamesRoute } from "./routes/admin-games";

const echoSchema = z.object({
  message: z.string().trim().min(1).max(200),
});

export const api = new Hono()
  .basePath("/api")
  .get("/health", (c) =>
    c.json({
      ok: true,
      service: "qr-hunt",
    }),
  )
  .get("/me", async (c) => {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    return c.json({ user: session.user });
  })
  .post("/echo", zValidator("json", echoSchema), (c) => {
    const { message } = c.req.valid("json");

    return c.json({ message });
  })
  .route("/admin/games", adminGamesRoute);

export type AppType = typeof api;
