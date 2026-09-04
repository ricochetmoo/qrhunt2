"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ErrorMessage } from "@/components/ui/field";
import {
  HeaderBar,
  Message,
  ScoutsCard,
  ScoutsHeader,
  ScoutsLink,
  ScoutsNavigation,
} from "@/components/ui";
import { apiClient } from "@/lib/api-client";

type StateResponse = Awaited<
  ReturnType<
    Awaited<ReturnType<(typeof apiClient.api.player.games)[":gameId"]["state"]["$get"]>>["json"]
  >
>;
type PlayerState = Extract<StateResponse, { state: unknown }>["state"];

function Navigation({ gameId }: { gameId: string }) {
  return (
    <HeaderBar level={1}>
      <ScoutsNavigation
        label="Game navigation"
        items={[
          { href: `/play/${gameId}`, label: "Game" },
          { href: `/play/${gameId}/history`, label: "History" },
          { href: `/play/${gameId}/hints`, label: "All Hints" },
          { href: `/play/${gameId}/help`, label: "Help", current: true },
        ]}
      />
    </HeaderBar>
  );
}

export function HelpPage({ gameId }: { gameId: string }) {
  const [state, setState] = useState<PlayerState | null>(null);
  const [blocked, setBlocked] = useState<"none" | "signin" | "unavailable">("none");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await apiClient.api.player.games[":gameId"].state.$get({
        param: { gameId },
      });

      if (response.status === 401 || response.status === 403) {
        setBlocked("signin");
        return;
      }

      if (!response.ok) {
        setBlocked("unavailable");
        return;
      }

      const { state: next } = await response.json();
      setBlocked("none");
      setState(next);
      setError(null);
    } catch {
      setError("Could not reach the game. Check your signal and pull to refresh.");
    }
  }, [gameId]);

  useEffect(() => {
    // Fetch-on-mount: state updates land after the network request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  if (blocked === "signin") {
    return (
      <>
        <ScoutsHeader title="QR Hunt" logo />
        <Shell>
          <ScoutsCard title="You're not in this game yet" variant="purple">
            <p>Join a team first to see the help for this game.</p>
            <ScoutsLink href="/" className="mt-4 inline-block">
              Go to the start page
            </ScoutsLink>
          </ScoutsCard>
        </Shell>
      </>
    );
  }

  if (blocked === "unavailable") {
    return (
      <>
        <ScoutsHeader title="QR Hunt" logo />
        <Shell>
          <ScoutsCard title="This game isn't available" variant="purple">
            <p>It may have been archived. Ask your leader.</p>
          </ScoutsCard>
        </Shell>
      </>
    );
  }

  if (!state) {
    return (
      <Shell>
        <ErrorMessage message={error} />
        <p className="text-center text-sm text-scouts-muted">Loading your game help…</p>
      </Shell>
    );
  }

  const { game } = state;

  return (
    <>
      <div>
        <ScoutsHeader title="QR Hunt" subtitle={game.name} logo />
        <Navigation gameId={game.id} />
      </div>

      <Shell>
        {game.status === "paused" ? (
          <Message title="Game paused" variant="warning">
            {game.pauseReason
              ? `${game.pauseReason} Scanning is off until the game resumes.`
              : "Scanning is off until the game resumes."}
          </Message>
        ) : null}
        {game.status === "finished" ? (
          <Message title="Game finished" variant="info">
            You can still view the help, hints and scan history for this game.
          </Message>
        ) : null}

        <ErrorMessage message={error} />

        <ScoutsCard
          title="Help"
          variant="orange"
        >
          <p className="whitespace-pre-line text-base">
            {game.helpText?.trim() || "No help text has been added for this game."}
          </p>
        </ScoutsCard>
      </Shell>
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pb-6 pt-6 sm:px-6">
      {children}
    </main>
  );
}
