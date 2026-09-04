import type { Metadata } from "next";

import { HelpPage } from "./help-page-client";

export const metadata: Metadata = {
  title: "QR Hunt",
  robots: { index: false, follow: false },
};

export default async function HelpRoute({ params }: PageProps<"/play/[gameId]/help">) {
  const { gameId } = await params;

  return <HelpPage gameId={gameId} />;
}
