import type { Metadata } from "next";

import { PlayerGameScreen } from "@/components/player/player-game-screen";

export const metadata: Metadata = {
  title: "QR Hunt",
  robots: { index: false, follow: false },
};

/**
 * The in-game player screen shell (mock data), previously mounted at `/`.
 * Kept reachable here until it is wired to the real player API.
 */
export default function PlayerDemoPage() {
  return <PlayerGameScreen />;
}
