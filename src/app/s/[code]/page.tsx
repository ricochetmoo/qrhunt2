import type { Metadata } from "next";

import { JoinFunnel } from "./join-funnel-client";

export const metadata: Metadata = {
  title: "Join the hunt · QR Hunt",
  robots: { index: false, follow: false },
};

/**
 * Where poster QR codes land (`${APP_URL}/s/<code>`). A GET here never
 * mutates anything — link previewers and crawlers only ever see this shell.
 * The funnel: onboard (name) → close-and-rescan persistence check → welcome
 * back → start the game. Throwaway contexts (iOS Control Centre scanner,
 * in-app browsers) are detected by user agent and by a live probe, and the
 * player is told to use the native Camera app instead.
 */
export default async function ScanLandingPage({ params }: PageProps<"/s/[code]">) {
  const { code } = await params;

  return <JoinFunnel code={code} />;
}
