import "server-only";

/**
 * Gate for the `/admin` pages (called from `src/app/admin/layout.tsx`).
 *
 * TODO(auth): read the session with `auth.api.getSession({ headers: await
 * headers() })` and `redirect()` to a sign-in page when missing or anonymous.
 * Intentionally a no-op for now — the admin area is open during early
 * development. Per-game authorization also belongs in the API layer
 * (`src/server/middleware/require-admin.ts`).
 */
export async function requireAdminPage(): Promise<void> {}
