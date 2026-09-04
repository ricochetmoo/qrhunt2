import type { Metadata } from "next";

import { HistoryScreen } from "./history-screen-client";

export const metadata: Metadata = {
  title: "QR Hunt",
  robots: { index: false, follow: false },
};

export default async function HistoryPage({
  params,
}: PageProps<"/play/[gameId]/history">) {
  const { gameId } = await params;

  return <HistoryScreen gameId={gameId} />;
}
