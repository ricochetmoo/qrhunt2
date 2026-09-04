"use client";

import { useCallback, useEffect, useState } from "react";

import { ErrorMessage } from "@/components/ui/field";
import { apiClient } from "@/lib/api-client";
import { PlayerPageHeader, PlayerPageLoading } from "@/components/player/player-page-layout";
import {
  DataTable,
  Message,
  ScoutsCard,
  ScoutsHeader,
  ScoutsLink,
  Tag,
} from "@/components/ui";

type StateResponse = Awaited<
  ReturnType<
    Awaited<ReturnType<(typeof apiClient.api.player.games)[":gameId"]["state"]["$get"]>>["json"]
  >
>;
type PlayerState = Extract<StateResponse, { state: unknown }>["state"];
type RouteEntry = PlayerState["route"]["codes"][number];

type HintRow = {
  id: string;
  number: number;
  entry: RouteEntry;
};

function hintText(entry: RouteEntry, hintsReleased: boolean): string {
  if (!hintsReleased) return "Hints will appear when the game starts.";
  if (entry.hint) return entry.hint;
  return "Locked - keep following the route to reveal this hint.";
}

export function HintsPage({ gameId }: { gameId: string }) {
  const [state, setState] = useState<PlayerState | null>(null);
  const [blocked, setBlocked] = useState<"none" | "signin" | "unavailable">("none");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      // The request resolves before any state is updated, so this is safe to call from an effect.
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
    // Fetch-on-mount: the state update happens after the network request.
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
          <ScoutsCard title="You&apos;re not in this game yet" variant="purple">
            <p>Scan a poster with your Camera app, or enter your game or rejoin code to get in.</p>
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
          <ScoutsCard title="This game isn&apos;t available" variant="purple">
            <p>It may have been archived. Ask your leader.</p>
          </ScoutsCard>
        </Shell>
      </>
    );
  }

  if (!state) {
    return (
      <PlayerPageLoading
        gameId={gameId}
        activePage="hints"
        label="Loading your hints"
        error={error}
      />
    );
  }

  const { game, route, progress } = state;
  const rows: HintRow[] = route.codes.map((entry) => ({
    id: entry.id,
    number: entry.position + 1,
    entry,
  }));
  const hintsReleased = progress?.hintsReleased ?? false;

  return (
    <>
      <PlayerPageHeader gameId={game.id} gameName={game.name} activePage="hints" />

      <Shell>

      {game.status === "paused" ? (
        <Message title="Game paused" variant="warning">
          {game.pauseReason ? `${game.pauseReason} Scanning is off until the game resumes.` : "Scanning is off until the game resumes."}
        </Message>
      ) : null}
      {game.status === "finished" ? (
        <Message title="The game has finished" variant="info">
          You can still look back through all of the hints you found.
        </Message>
      ) : null}

      <ErrorMessage message={error} />

      <ScoutsCard
        title="All Hints"
        description="See all the hints for this game, so you know where to be keeping an eye out!"
        variant="primary"
      >
        <DataTable<HintRow>
          caption=""
          rows={rows}
          getRowKey={(row) => row.id}
          className="min-w-[40rem] text-base"
          columns={[
            {
              key: "number",
              header: "No.",
              numeric: true,
              render: (row) => <span className="font-bold tabular-nums">{row.number}</span>,
            },
            {
              key: "hint",
              header: "Hint",
              render: (row) => (
                <span className={!row.entry.hint ? "text-scouts-muted" : undefined}>
                  {hintText(row.entry, hintsReleased)}
                </span>
              ),
            },
            {
              key: "found",
              header: "Status",
              render: (row) =>
                row.entry.found ? (
                  <Tag variant="success">Found</Tag>
                ) : (
                  <Tag variant="grey">Not found</Tag>
                ),
            },
          ]}
        />
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
