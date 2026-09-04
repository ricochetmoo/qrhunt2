"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui";

/** Shows a "carry on" link when this browser has an active game remembered. */
export function ContinuePlaying() {
  const router = useRouter();
  const [active, setActive] = useState<{ gameId: string; name: string } | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("qr-hunt:active-game");

      if (raw) {
        const parsed = JSON.parse(raw) as { gameId?: string; name?: string };

        if (parsed.gameId && parsed.name) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only storage read
          setActive({ gameId: parsed.gameId, name: parsed.name });
        }
      }
    } catch {
      // no stored game
    }
  }, []);

  if (!active) return null;

  return (
    <Button
      type="button"
      variant="primary"
      size="lg"
      className="w-full"
      onClick={() => router.push(`/play/${active.gameId}`)}
    >
      Carry on playing {active.name}
    </Button>
  );
}
