import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import type { Game } from "@/db/types";
import { getGameForAdmin } from "@/server/games/access";

import type { AdminPrincipal } from "./admin-principal";
import { resolveAdminPrincipal } from "./admin-principal";

/**
 * Gate for the `/admin` pages (called from `src/app/admin/layout.tsx`).
 *
 * The admin auth instance has its own cookie prefix and session configuration,
 * so a player session cannot satisfy this page gate. The shared principal
 * resolver also checks the persisted application-level administrator role.
 * Per-game authorization is provided by `requireAdminGamePage` for direct
 * page loads and by the API middleware for Hono requests.
 */
export async function requireAdminPage(): Promise<AdminPrincipal> {
  const result = await resolveAdminPrincipal(await headers());

  if (result.status === "unauthenticated") {
    redirect("/admin-auth/sign-in");
  }

  if (result.status === "forbidden") {
    notFound();
  }

  return result.principal;
}

/** Resolve an admin page's game only when the current admin is assigned to it. */
export async function requireAdminGamePage(gameId: string): Promise<Game> {
  const { userId } = await requireAdminPage();
  const game = await getGameForAdmin(userId, gameId);

  if (!game) {
    notFound();
  }

  return game;
}
