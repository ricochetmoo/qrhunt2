import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { resolveAdminPrincipal } from "./admin-principal";

/**
 * Gate for the `/admin` pages (called from `src/app/admin/layout.tsx`).
 *
 * The admin auth instance has its own cookie prefix and session configuration,
 * so a player session cannot satisfy this page gate. The shared principal
 * resolver also checks the persisted application-level administrator role.
 * Per-game authorization still belongs in the API layer
 * (`src/server/middleware/require-admin.ts`).
 */
export async function requireAdminPage(): Promise<void> {
  const result = await resolveAdminPrincipal(await headers());

  if (result.status === "unauthenticated") {
    redirect("/admin-auth/sign-in");
  }

  if (result.status === "forbidden") {
    notFound();
  }
}
