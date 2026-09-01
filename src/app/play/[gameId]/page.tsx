import type { Metadata } from "next";

import { GameScreen } from "./game-screen-client";

export const metadata: Metadata = {
  title: "Play · QR Hunt",
  robots: { index: false, follow: false },
};

/**
 * The live game screen: reads the aggregate player state (next clue, last
 * scanned stop, progress, leaderboard) and submits manual code entries.
 * Requires an enrolled player; otherwise points back to the join flow.
 */
export default async function PlayPage({ params }: PageProps<"/play/[gameId]">) {
  const { gameId } = await params;

  return <GameScreen gameId={gameId} />;
}
