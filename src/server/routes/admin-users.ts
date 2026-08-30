import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { getUserDetail, listRecentUsers, searchUsers } from "@/server/domain/users";
import { requireAdmin } from "@/server/middleware/require-admin";

const listUsersQuerySchema = z.object({
  query: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const userIdParamSchema = z.object({ userId: z.string().min(1) });

/** Admin user listing. Mounted at `/api/admin/users` from `src/server/api.ts`. */
export const adminUsersRoute = new Hono()
  .use("*", requireAdmin)
  .get("/", zValidator("query", listUsersQuerySchema), async (c) =>
    c.json(await searchUsers(c.req.valid("query"))),
  )
  .get("/recent", async (c) => c.json({ users: await listRecentUsers() }))
  .get("/:userId", zValidator("param", userIdParamSchema), async (c) => {
    const detail = await getUserDetail(c.req.valid("param").userId);

    if (!detail) {
      return c.json({ error: "User not found.", code: "NOT_FOUND" }, 404);
    }

    return c.json(detail);
  });
