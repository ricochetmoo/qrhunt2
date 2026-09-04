import type { Metadata } from "next";

import { HintsPage } from "./hints-page-client";

export const metadata: Metadata = {
  title: "QR Hunt",
  robots: { index: false, follow: false },
};

export default async function HintsRoute({ params }: PageProps<"/play/[gameId]/hints">) {
  const { gameId } = await params;

  return <HintsPage gameId={gameId} />;
}
