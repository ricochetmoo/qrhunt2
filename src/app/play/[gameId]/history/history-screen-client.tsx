"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { PlayerPageHeader, PlayerPageLoading } from "@/components/player/player-page-layout";
import {
  Message,
  ScoutsCard,
  ScoutsHeader,
  ScoutsLink,
  Timeline,
  type TimelineItem,
} from "@/components/ui";
import { ErrorMessage } from "@/components/ui/field";
import { apiClient } from "@/lib/api-client";

type StateResponse = Awaited<
  ReturnType<
    Awaited<ReturnType<(typeof apiClient.api.player.games)[":gameId"]["state"]["$get"]>>["json"]
  >
>;
type PlayerState = Extract<StateResponse, { state: unknown }>["state"];
type HistoryEntry = PlayerState["history"][number];

type HistoryOutcome = {
  label: string;
  description: string;
  variant: TimelineItem["variant"];
};

const HISTORY_OUTCOMES: Record<string, HistoryOutcome> = {
  accepted: {
    label: "Found",
    description: "This code counted towards your team's progress.",
    variant: "success",
  },
  wildcard: {
    label: "Wildcard",
    description: "Your team found the wildcard.",
    variant: "warning",
  },
  duplicate: {
    label: "Already found",
    description: "Your team had already found this code, so progress stayed the same.",
    variant: "info",
  },
  out_of_order: {
    label: "Out of order",
    description: "This code is on the route, but it was not the next code to find.",
    variant: "warning",
  },
  late: {
    label: "Too late",
    description: "The game had finished, so this scan did not count.",
    variant: "danger",
  },
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function outcomeFor(result: string): HistoryOutcome {
  return (
    HISTORY_OUTCOMES[result] ?? {
      label: result,
      description: "This scan was recorded for your team.",
      variant: "info",
    }
  );
}

function stopTitle(entry: HistoryEntry, wildcardName: string | null): string {
  if (entry.isWildcard) return wildcardName || "Wildcard";
  return entry.stopName || "Unknown stop";
}

function positionLabel(entry: HistoryEntry): string | null {
  if (entry.isWildcard) return null;
  return entry.position === null ? null : `Stop ${entry.position + 1}`;
}

function historyDescription(entry: HistoryEntry, outcome: HistoryOutcome): ReactNode {
  const position = positionLabel(entry);

  return (
    <>
      <span className="mr-2 inline-flex items-center rounded-full bg-scouts-grey-light px-2 py-0.5 text-sm font-bold text-scouts-text">
        {outcome.label}
      </span>
      {position ? <span className="text-sm text-scouts-muted">{position}</span> : null}
      <span className="mt-2 block">{outcome.description}</span>
      {entry.hint ? (
        <span className="mt-2 block whitespace-pre-line text-scouts-muted">
          <span className="font-bold text-scouts-text">Clue:</span> “{entry.hint}”
        </span>
      ) : null}
      {entry.funFact ? (
        <span className="mt-2 block whitespace-pre-line text-scouts-muted">
          <span className="font-bold text-scouts-text">Fun fact:</span> {entry.funFact}
        </span>
      ) : null}
    </>
  );
}

function buildTimelineItems(state: PlayerState): TimelineItem[] {
  const { game, history, team } = state;

  return history.map((entry) => {
    const outcome = outcomeFor(entry.result);
    const member = team?.members.find((candidate) => candidate.userId === entry.scannedByUserId);

    return {
      id: entry.id,
      title: stopTitle(entry, game.wildcard.name),
      date: dateFormat.format(new Date(entry.scannedAt)),
      byline: member ? (member.isYou ? "you" : member.name) : undefined,
      description: historyDescription(entry, outcome),
      variant: outcome.variant,
    };
  });
}

export function HistoryScreen({ gameId }: { gameId: string }) {
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
      setError("Could not reach the game. Check your signal and try again.");
    }
  }, [gameId]);

  useEffect(() => {
    // Fetch-on-mount: state updates land after the network await, not synchronously.
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
        <CardMessage title="You're not in this game yet">
          <p>Join a team first to see its scan history.</p>
          <Link href="/" className="font-bold underline">
            Go to the start page
          </Link>
        </CardMessage>
        </Shell>
      </>
    );
  }

  if (blocked === "unavailable") {
    return (
      <>
        <ScoutsHeader title="QR Hunt" logo />
        <Shell>
        <CardMessage title="This game isn't available">
          <p>It may have been archived. Ask your leader.</p>
        </CardMessage>
        </Shell>
      </>
    );
  }

  if (!state) {
    return (
      <PlayerPageLoading
        gameId={gameId}
        activePage="history"
        label="Loading your scan history"
        error={error}
        className="max-w-md"
      />
    );
  }

  const { game, history, progress, team } = state;
  const timelineItems = buildTimelineItems(state);
  const found = progress?.found ?? 0;
  const total = progress?.total ?? 0;

  return (
    <>
      <PlayerPageHeader gameId={game.id} gameName={game.name} activePage="history" />

      <Shell>

      {game.status === "paused" ? (
        <Message variant="warning" title="Game paused">
          <p>{game.pauseReason ? `${game.pauseReason} Scanning is off until the game resumes.` : "Scanning is off until the game resumes."}</p>
        </Message>
      ) : null}
      {game.status === "finished" ? (
        <Message variant="info" title="Game finished">
          <p>Your team&apos;s history is still available to look back over.</p>
        </Message>
      ) : null}

      <ErrorMessage message={error} />

      <ScoutsCard
        title="Scan history"
        variant="primary"
      >
        {history.length > 0 ? (
          <Timeline items={timelineItems} />
        ) : (
          <div className="space-y-3">
            <p>No scans yet.</p>
            <p className="text-base text-scouts-muted">
              Scan your first QR code from the game screen and it will appear here.
            </p>
            <ScoutsLink href={`/play/${game.id}`}>Back to the game</ScoutsLink>
          </div>
        )}
      </ScoutsCard>
      </Shell>
    </>
  );
}

function CardMessage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <ScoutsCard title={title} variant="primary">
      <div className="space-y-2 text-base">{children}</div>
    </ScoutsCard>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-6 pt-6">{children}</main>;
}
