import { hc } from "hono/client";

import type { AppType } from "@/server/api";

// Server components should call domain services directly rather than going
// through HTTP; this base URL only matters for the rare server-side caller.
const serverBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const apiClient = hc<AppType>(
  typeof window === "undefined" ? serverBaseUrl : window.location.origin,
);
