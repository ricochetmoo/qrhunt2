import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema";
import { adminAuth } from "@/lib/admin-auth";

export type AdminPrincipal = {
  userId: string;
};

export type AdminPrincipalResult =
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "authenticated"; principal: AdminPrincipal };

/**
 * Resolve the admin session and application-level administrator role.
 *
 * `adminAuth` deliberately shares Better Auth's user/session tables with the
 * player auth instance. A valid admin-auth session therefore proves identity,
 * but not that the account is allowed to use the admin application. Read the
 * application flags from the database for the authorization decision.
 */
export async function resolveAdminPrincipal(
  requestHeaders: Headers,
): Promise<AdminPrincipalResult> {
  const session = await adminAuth.api.getSession({ headers: requestHeaders });

  if (!session) {
    return { status: "unauthenticated" };
  }

  const [account] = await db
    .select({ id: user.id, isAdmin: user.isAdmin, isAnonymous: user.isAnonymous })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!account || account.isAnonymous || !account.isAdmin) {
    return { status: "forbidden" };
  }

  return {
    status: "authenticated",
    principal: { userId: account.id },
  };
}
