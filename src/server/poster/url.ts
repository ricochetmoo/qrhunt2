import "server-only";

const DEFAULT_APP_URL = "http://localhost:3000";

/** Resolve the public application origin used by links printed for players. */
export function getAppUrl(): string {
  const configuredUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    DEFAULT_APP_URL;
  const appUrl = /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`;

  return appUrl.replace(/\/+$/, "");
}

/** The canonical payload encoded by both PDF posters and image exports. */
export function buildQrPayload(code: string, appUrl = getAppUrl()): string {
  return `${appUrl}/s/${encodeURIComponent(code)}`;
}
