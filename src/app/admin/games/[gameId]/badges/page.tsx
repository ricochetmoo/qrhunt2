"use client";

import { useParams } from "next/navigation";

import { BadgeQueue } from "@/components/admin/badge-queue";

/**
 * The finish-line desk: teams that have checked in (scanned the "I'm done"
 * code and given feedback), waiting for an organiser to hand over a badge.
 */
export default function AdminGameBadgesPage() {
  const { gameId } = useParams<{ gameId: string }>();

  return <BadgeQueue gameId={gameId} />;
}
