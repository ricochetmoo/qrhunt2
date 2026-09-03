import "server-only";

import type { Game } from "@/db/types";
import { gameExists, getGameForAdmin } from "@/server/games/access";

import type { AdminPrincipal } from "./admin-principal";
import { resolveAdminPrincipal } from "./admin-principal";

type AdminRequestFailure = {
  ok: false;
  response: Response;
};

export type AdminRequestResult =
  | { ok: true; principal: AdminPrincipal }
  | AdminRequestFailure;

export type AdminGameRequestResult =
  | { ok: true; principal: AdminPrincipal; game: Game }
  | AdminRequestFailure;

function jsonError(error: string, status: 401 | 403 | 404, code?: "NOT_FOUND"): Response {
  return Response.json(code ? { error, code } : { error }, { status });
}

/** Check the admin session and persisted administrator role for an HTTP request. */
export async function requireAdminRequest(
  request: Request,
): Promise<AdminRequestResult> {
  const auth = await resolveAdminPrincipal(request.headers);

  if (auth.status === "unauthenticated") {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }

  if (auth.status === "forbidden") {
    return { ok: false, response: jsonError("Forbidden", 403) };
  }

  return { ok: true, principal: auth.principal };
}

/** Check the admin session, role, and membership for a game-scoped request. */
export async function requireAdminGameRequest(
  request: Request,
  gameId: string,
): Promise<AdminGameRequestResult> {
  const auth = await requireAdminRequest(request);

  if (!auth.ok) {
    return auth;
  }

  const game = await getGameForAdmin(auth.principal.userId, gameId);

  if (!game) {
    if (await gameExists(gameId)) {
      return { ok: false, response: jsonError("Forbidden", 403) };
    }

    return {
      ok: false,
      response: jsonError("Game not found", 404, "NOT_FOUND"),
    };
  }

  return { ok: true, principal: auth.principal, game };
}
