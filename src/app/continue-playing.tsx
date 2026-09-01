"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Shows a "carry on" link when this browser has an active game remembered. */
export function ContinuePlaying() {
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
    <Link
      href={`/play/${active.gameId}`}
      className="block rounded-lg border border-slate-900 bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white shadow-sm hover:bg-slate-700"
    >
      ▶ Carry on playing “{active.name}”
    </Link>
  );
}
