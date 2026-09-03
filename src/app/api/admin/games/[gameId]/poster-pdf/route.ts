import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { qr_codes } from "@/db/schema";
import { adminAuth } from "@/lib/admin-auth";
import { gameExists, getGameForAdmin } from "@/server/games/access";
import { buildGamePosterPdf } from "@/server/poster/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  gameId: z.string().trim().min(1),
});

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "game";
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/games/[gameId]/poster-pdf">,
) {
  const parsedParams = paramsSchema.safeParse(await ctx.params);

  if (!parsedParams.success) {
    return Response.json({ error: "Invalid game id" }, { status: 400 });
  }

  const { gameId } = parsedParams.data;

  const session = await adminAuth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const game = await getGameForAdmin(session.user.id, gameId);

  if (!game) {
    if (await gameExists(gameId)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json({ error: "Game not found" }, { status: 404 });
  }

  const rows = await db
    .select({ name: qr_codes.name, code: qr_codes.code })
    .from(qr_codes)
    .where(eq(qr_codes.gameId, gameId))
    .orderBy(qr_codes.createdAt, qr_codes.id);

  if (rows.length === 0) {
    return Response.json(
      { error: "This game has no QR codes yet" },
      { status: 422 },
    );
  }

  const bytes = await buildGamePosterPdf({
    game: { name: game.name },
    codes: rows.map((row) => ({ name: row.name, code: row.code })),
  });

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugify(game.name)}-qr-posters.pdf"`,
    },
  });
}
