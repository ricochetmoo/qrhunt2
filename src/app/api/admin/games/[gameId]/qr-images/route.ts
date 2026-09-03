import { z } from "zod";

import { listQrCodes } from "@/server/domain/qr-codes";
import { requireAdminGameRequest } from "@/server/auth/require-admin-request";
import { buildQrImagesZip, qrImageZipFilename } from "@/server/qr-images/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  gameId: z.string().trim().min(1),
});

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/games/[gameId]/qr-images">,
) {
  const parsedParams = paramsSchema.safeParse(await ctx.params);

  if (!parsedParams.success) {
    return Response.json({ error: "Invalid game id" }, { status: 400 });
  }

  const { gameId } = parsedParams.data;

  const auth = await requireAdminGameRequest(request, gameId);

  if (!auth.ok) {
    return auth.response;
  }

  const { game } = auth;

  const qrCodes = await listQrCodes(gameId);

  if (qrCodes.length === 0) {
    return Response.json(
      { error: "This game has no QR codes yet" },
      { status: 422 },
    );
  }

  const zip = await buildQrImagesZip({
    gameName: game.name,
    codes: qrCodes.map(({ name, code }) => ({ name, code })),
  });

  return new Response(new Uint8Array(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${qrImageZipFilename(game.name)}"`,
      "Content-Length": String(zip.byteLength),
    },
  });
}
