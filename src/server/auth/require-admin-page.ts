import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { adminAuth } from "@/lib/admin-auth";

/**
 * Gate for the `/admin` pages (called from `src/app/admin/layout.tsx`).
 *
 * The admin auth instance has its own cookie prefix and session configuration,
 * so a player session cannot satisfy this page gate. Per-game authorization
 * still belongs in the API layer (`src/server/middleware/require-admin.ts`).
 */
export async function requireAdminPage(): Promise<void> {
  const session = await adminAuth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/admin-auth/sign-in");
  }
}
