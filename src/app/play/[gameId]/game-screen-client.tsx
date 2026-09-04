"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { DEFAULT_COMPLETION_MESSAGE } from "@/lib/completion";
import { GAME_MODE_PLAYER_BLURBS, isGameMode } from "@/lib/game-mode";
import { SCAN_RESULT_MESSAGES, isRetryableScanResult, type ScanResult } from "@/lib/scan-results";
import { rememberActiveGame } from "@/lib/player-storage";
import { PlayerPageHeader, PlayerPageLoading } from "@/components/player/player-page-layout";
import {
  ScoutsCard,
  ScoutsHeading,
  ScoutsLink,
  ProgressBar,
  Timeline,
  Box,
  Message,
} from "@/components/ui";

type StateResponse = Awaited<
  ReturnType<
    Awaited<ReturnType<(typeof apiClient.api.player.games)[":gameId"]["state"]["$get"]>>["json"]
  >
>;
type PlayerState = Extract<StateResponse, { state: unknown }>["state"];

type ScanNotice = {
  result: ScanResult;
  message: string;
  stopName: string | null;
  funFact: string | null;
  /** Set when the code entered was the finish-line code: where to check in. */
  checkInHref: string | null;
};

const timeFormat = new Intl.DateTimeFormat("en-GB", { timeStyle: "short" });

/** History rows shown before "Show all"; keeps the card short on small screens. */
const HISTORY_PREVIEW_COUNT = 6;

/** Compact labels for history rows; SCAN_RESULT_MESSAGES is too long for a pill. */
const HISTORY_RESULT_LABELS: Record<string, string> = {
  accepted: "Found",
  wildcard: "Wildcard",
  duplicate: "Duplicate",
  out_of_order: "Out of order",
  late: "Too late",
};

function historyPillClass(result: string): string {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

  if (result === "accepted") return `${base} bg-green-100 text-green-800`;
  if (result === "wildcard") return `${base} bg-amber-100 text-amber-800`;

  return `${base} bg-slate-100 text-slate-600`;
}

export function GameScreen({ gameId }: { gameId: string }) {
  const [state, setState] = useState<PlayerState | null>(null);
  const [blocked, setBlocked] = useState<"none" | "signin" | "unavailable">("none");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<ScanNotice | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [completionViewDismissed, setCompletionViewDismissed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      // No state updates before the first await: this runs from an effect.
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
      rememberActiveGame(gameId, next.game.name);
    } catch {
      setError("Could not reach the game. Check your signal and pull to refresh.");
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

  async function handleSubmitCode(event: FormEvent) {
    event.preventDefault();
    const entered = code.trim();

    if (!entered) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiClient.api.player.games[":gameId"].scans.sync.$post({
        param: { gameId },
        json: {
          scans: [
            {
              clientScanId:
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : `manual-${Date.now()}`,
              code: entered,
              scannedAt: new Date().toISOString(),
            },
          ],
        },
      });

      if (!response.ok) {
        setError("That didn't go through - try again.");
        return;
      }

      const { results, state: next } = await response.json();
      const [outcome] = results;

      setState(next);
      setNotice({
        result: outcome.result,
        message: SCAN_RESULT_MESSAGES[outcome.result] ?? outcome.message,
        stopName: outcome.qrCodeName,
        funFact: outcome.funFact,
        checkInHref:
          outcome.result === "completion" ? `/s/${encodeURIComponent(entered)}` : null,
      });

      if (outcome.result === "accepted" || outcome.result === "wildcard") {
        setCode("");
      }
    } catch {
      setError("Could not reach the game - your code wasn't sent. Try again when you have signal.");
    } finally {
      setBusy(false);
    }
  }

  if (blocked === "signin") {
    return (
      <Shell>
        <Card>
          <CardBody className="space-y-2">
            <h1 className="text-lg font-semibold text-slate-900">You&apos;re not in this game yet</h1>
            <p className="text-sm text-slate-600">
              Scan a poster with your Camera app, or enter your game or rejoin code to get in.
            </p>
            <Link href="/" className="text-sm font-medium underline">
              Go to the start page
            </Link>
          </CardBody>
        </Card>
      </Shell>
    );
  }

  if (blocked === "unavailable") {
    return (
      <Shell>
        <Card>
          <CardBody className="space-y-2">
            <h1 className="text-lg font-semibold text-slate-900">This game isn&apos;t available</h1>
            <p className="text-sm text-slate-600">It may have been archived. Ask your leader.</p>
          </CardBody>
        </Card>
      </Shell>
    );
  }

  if (!state) {
    return (
      <PlayerPageLoading
        gameId={gameId}
        activePage="game"
        label="Loading your game"
        error={error}
        className="max-w-md"
      />
    );
  }

  const { game, team, progress, leaderboard, history } = state;
  const visibleHistory = showAllHistory ? history : history.slice(0, HISTORY_PREVIEW_COUNT);
  const you = leaderboard.find((entry) => entry.isYou) ?? null;
  const completedTeams = leaderboard.filter(
    (entry) => entry.total > 0 && entry.found === entry.total,
  ).length;
  const yourName = team?.members.find((member) => member.isYou)?.name ?? team?.name ?? "you";
  const percent = progress && progress.total > 0 ? Math.round((progress.found / progress.total) * 100) : 0;

  if (progress?.complete && team && !completionViewDismissed) {
    return (
      <CompletionScreen
        game={game}
        team={team}
        onReturn={() => setCompletionViewDismissed(true)}
      />
    );
  }

  return (
    <>
      <PlayerPageHeader gameId={game.id} gameName={game.name} activePage="game" />

      <Shell>

      {game.status === "paused" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          ⏸ Game paused{game.pauseReason ? ` - ${game.pauseReason}` : ""}. Scanning is off until it
          resumes.
        </div>
      ) : null}
      {game.status === "finished" ? (
        <div className="rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-900">
          🏁 The game has finished. Thanks for playing!
        </div>
      ) : null}

      <ErrorMessage message={error} />

      {/* Your progress */}
      <ScoutsCard
        title="Progress"
        description={`You have found ${progress?.found ?? 0} of ${progress?.total ?? 0} codes`}
        >
          <ProgressBar
            value={progress?.found ?? 0}
            max={progress?.total ?? 0}
            label=""
            variant={progress?.complete ? "success" : "primary"}
          />
      </ScoutsCard>
      {progress && !progress.complete ? (
        <ScoutsCard
          title="Next clue"
          description="Use this to help you find the next QR code. You don't have to go in order, so scan any you find!"
        >
          <Box size="md">
            {progress.hintsReleased && progress.nextHint ? (
                <p>“{progress.nextHint}”</p>
              ) : (
                <p>
                  {game.status === "published" || game.status === "draft"
                    ? "The game hasn't started yet - your first clue appears here when it does."
                    : "Your clue will appear here once you're released to start."}
                </p>
              )}
          </Box>
        </ScoutsCard>
      ): null}
      <ScoutsCard
        title="Enter a code"
        description="If scanning isn't working, you can type the code manually instead."
      >
        {notice ? (
            <Message
              title={notice.message}
              variant={notice.result === "accepted" || notice.result === "wildcard" ? "success" : "warning"}
              className="mb-6"
            >
              {notice.funFact ? (
                <span>
                  <span className="font-semibold">Fun fact:</span> {notice.funFact}
                </span>
              ) : null}
              {notice.checkInHref ? (
                <Link href={notice.checkInHref}>
                  Check in at the finish line →
                </Link>
              ) : null}
            </Message>
            ) : null}
            <form onSubmit={handleSubmitCode} className="flex gap-2">
              <label htmlFor="scan-code" className="sr-only">
                Code
              </label>
              <Input
                id="scan-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="e.g. ABC234DE"
                autoComplete="off"
                spellCheck={false}
                maxLength={16}
                className="font-mono tracking-widest"
              />
              <Button type="submit" disabled={busy || !code.trim()}>
                {busy ? "Checking…" : "Submit"}
              </Button>
            </form>
      </ScoutsCard>
      <ScoutsCard
        title="Rejoin Code"
        description="Use this code to rejoin your game if you switch phones"
      >
        <Box size="lg" className="font-mono tracking-widest text-center">
            {team?.teamCode ?? "—"}
        </Box>
      </ScoutsCard>
      </Shell>
    </>
  );
}

function CompletionScreen({
  game,
  team,
  onReturn,
}: {
  game: PlayerState["game"];
  team: NonNullable<PlayerState["team"]>;
  onReturn: () => void;
}) {
  const completionTime = team.finishedAt;
  const message = game.completionMessage?.trim() || DEFAULT_COMPLETION_MESSAGE;

  return (
    <Shell>
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Hunt complete</p>
        <h1 className="text-xl font-semibold text-slate-900">{game.name}</h1>
      </header>

      <section aria-labelledby="completion-heading" aria-describedby="completion-message">
        <Card>
          <CardBody className="space-y-6 text-center">
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="space-y-2"
            >
              <div
                aria-hidden="true"
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700"
              >
                ✓
              </div>
              <h2 id="completion-heading" className="text-2xl font-semibold text-slate-900">
                Route complete
              </h2>
              <p className="text-sm font-medium text-green-700">100% of the route found</p>
            </div>

            <p id="completion-message" className="whitespace-pre-line text-base leading-7 text-slate-700">
              {message}
            </p>

            {team.prizeIssuedAt ? (
              <div className="rounded-md border border-green-200 bg-green-50 px-3 py-3 text-left text-sm text-green-900">
                🎖 Badge issued at {timeFormat.format(new Date(team.prizeIssuedAt))}. Thanks for
                playing!
              </div>
            ) : team.reportedCompletedAt ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-left text-sm text-amber-900">
                ✅ You checked in at {timeFormat.format(new Date(team.reportedCompletedAt))}. Show
                this screen at the <strong>Digital Team tent</strong> to collect your badge.
              </div>
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Claim your badge</p>
                <p className="mt-1">
                  Head to the <strong>Digital Team tent</strong> and scan the{" "}
                  {game.completion ? (
                    <>
                      <strong>&quot;{game.completion.name}&quot;</strong> QR code
                    </>
                  ) : (
                    <>finish-line QR code</>
                  )}{" "}
                  with your Camera app. Tell us how it went and we&apos;ll check you in.
                </p>
              </div>
            )}

            <dl className="divide-y divide-slate-100 rounded-md border border-slate-200 text-left">
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-slate-500">Team</dt>
                <dd className="text-right text-sm font-semibold text-slate-900">{team.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-slate-500">Completed</dt>
                <dd className="text-right text-sm font-semibold text-slate-900">
                  {completionTime ? timeFormat.format(new Date(completionTime)) : "Time recorded"}
                </dd>
              </div>
            </dl>

            <Button className="w-full" variant="secondary" onClick={onReturn}>
              View progress, history and leaderboard
            </Button>
          </CardBody>
        </Card>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-6 pt-6">{children}</main>
  );
}

function ordinal(n: number): string {
  const suffixes: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };
  const v = n % 100;

  return `${n}${v >= 11 && v <= 13 ? "th" : (suffixes[n % 10] ?? "th")}`;
}
