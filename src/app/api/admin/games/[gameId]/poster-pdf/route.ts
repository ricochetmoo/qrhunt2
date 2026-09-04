import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { qr_codes } from "@/db/schema";
import { requireAdminGameRequest } from "@/server/auth/require-admin-request";
import {
  buildGameLabelSheetPdf,
  buildGamePosterPdf,
} from "@/server/poster/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  gameId: z.string().trim().min(1),
});

const formatSchema = z.enum(["poster", "labels"]);

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

  const parsedFormat = formatSchema.safeParse(
    request.nextUrl.searchParams.get("format") ?? "poster",
  );

  if (!parsedFormat.success) {
    return Response.json({ error: "Invalid poster format" }, { status: 400 });
  }

  const auth = await requireAdminGameRequest(request, gameId);

  if (!auth.ok) {
    return auth.response;
  }

  const { game } = auth;

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

  const input = {
    game: { name: game.name },
    codes: rows.map((row) => ({ name: row.name, code: row.code })),
  };
  const bytes =
    parsedFormat.data === "labels"
      ? await buildGameLabelSheetPdf(input)
      : await buildGamePosterPdf(input);
  const fileSuffix =
    parsedFormat.data === "labels" ? "qr-label-sheets" : "qr-posters";

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugify(game.name)}-${fileSuffix}.pdf"`,
    },
  });
}
