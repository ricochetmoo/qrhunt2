"use client";

import { useParams, usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { AdminGameNav } from "@/components/admin/admin-game-nav";
import { AdminGameEditNav } from "@/components/admin/admin-game-edit-nav";
import { HeaderBar, ScoutsHeader } from "@/components/ui/header";
import { ScoutsNavigation } from "@/components/ui/navigation";
import { readCachedGameName, rememberActiveGame } from "@/lib/player-storage";

type Hunt = { gameId: string; name: string };
const HuntContext = createContext<((hunt: Hunt) => void) | null>(null);

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getServerGameName() {
  return null;
}

/** Publishes an authorized page's name without fetching the game again. */
export function AdminHuntName({ gameId, name }: Hunt) {
  const setHunt = useContext(HuntContext);

  useEffect(() => {
    if (!name.trim()) return;
    rememberActiveGame(gameId, name);
    setHunt?.({ gameId, name });
  }, [gameId, name, setHunt]);

  return null;
}

export function ScoutsNav({ children }: { children: ReactNode }) {
  const { gameId } = useParams<{ gameId?: string }>();
  const pathname = usePathname();
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const getCachedGameName = useCallback(
    () => (gameId ? readCachedGameName(gameId) : null),
    [gameId],
  );
  const cachedName = useSyncExternalStore(
    subscribeToStorage,
    getCachedGameName,
    getServerGameName,
  );
  const name = gameId ? (hunt?.gameId === gameId ? hunt.name : cachedName) : null;

  return (
    <HuntContext.Provider value={setHunt}>
      <div>
        <ScoutsHeader title="QR Hunt" subtitle={name} logo />
        <HeaderBar level={1}>
          <ScoutsNavigation
            label="Admin navigation"
            items={[
              {
                href: "/admin/games",
                label: "Games",
                current: pathname === "/admin/games" || pathname.startsWith("/admin/games/"),
              },
              {
                href: "/admin/users",
                label: "Users",
                current: pathname === "/admin/users" || pathname.startsWith("/admin/users/"),
              },
            ]}
          />
        </HeaderBar>
        {gameId ? <AdminGameNav gameId={gameId} /> : null}
        {gameId && pathname === `/admin/games/${encodeURIComponent(gameId)}/edit` ? (
          <AdminGameEditNav key={gameId} gameId={gameId} />
        ) : null}
      </div>
      {children}
    </HuntContext.Provider>
  );
}
