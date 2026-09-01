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

const ACTIVE_GAME_KEY = "qr-hunt:active-game";

type StateResponse = Awaited<
  ReturnType<
    Awaited<ReturnType<(typeof apiClient.api.player.games)[":gameId"]["state"]["$get"]>>["json"]
  >
>;
type PlayerState = Extract<StateResponse, { state: unknown }>["state"];

type ScanNotice = { result: ScanResult; message: string; stopName: string | null };

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

function rememberActiveGame(gameId: string, name: string) {
  try {
    window.localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify({ gameId, name }));
  } catch {
    // convenience only
  }
}

export function GameScreen({ gameId }: { gameId: string }) {
  const [state, setState] = useState<PlayerState | null>(null);
  const [blocked, setBlocked] = useState<"none" | "signin" | "unavailable">("none");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<ScanNotice | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
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
      <Shell>
        <ErrorMessage message={error} />
        <p className="text-center text-sm text-slate-500">Loading your game…</p>
      </Shell>
    );
  }

  const { game, team, progress, leaderboard, history } = state;
  const visibleHistory = showAllHistory ? history : history.slice(0, HISTORY_PREVIEW_COUNT);
  const you = leaderboard.find((entry) => entry.isYou) ?? null;
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
    <Shell>
      <header className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-slate-900">{game.name}</h1>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={busy} aria-label="Refresh">
            ↻
          </Button>
        </div>
        {isGameMode(game.mode) ? (
          <p className="text-xs text-slate-500">{GAME_MODE_PLAYER_BLURBS[game.mode]}</p>
        ) : null}
      </header>

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
      <Card>
        <CardHeader
          title={`Your progress, ${yourName}`}
          description={
            you ? `You're ${ordinal(you.rank)} of ${leaderboard.length}` : undefined
          }
        />
        <CardBody className="space-y-3">
          {progress ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold text-slate-900">
                  {progress.found}
                  <span className="text-base font-normal text-slate-500"> / {progress.total} stops</span>
                </span>
                {progress.wildcardFound ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    ★ Wildcard found
                  </span>
                ) : null}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${percent}%` }} />
              </div>
              {progress.complete ? (
                <p className="text-sm font-medium text-green-700">
                  🎉 Route complete - you found everything!
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-500">Join a team to start tracking progress.</p>
          )}
          {team ? (
            <p className="text-xs text-slate-500">
              Rejoin code: <code className="font-mono font-semibold">{team.teamCode}</code> - use it
              if you switch phones.
            </p>
          ) : null}
        </CardBody>
      </Card>

      {/* Next clue */}
      {progress && !progress.complete ? (
        <Card>
          <CardHeader
            title={game.settings.allowOutOfOrder ? "A clue to chase" : "Your next clue"}
            description={
              game.settings.allowOutOfOrder
                ? "Stops can be found in any order - this is the next one on the list."
                : undefined
            }
          />
          <CardBody>
            {progress.hintsReleased && progress.nextHint ? (
              <p className="whitespace-pre-line text-base text-slate-900">“{progress.nextHint}”</p>
            ) : (
              <p className="text-sm text-slate-500">
                {game.status === "published" || game.status === "draft"
                  ? "The game hasn't started yet - your first clue appears here when it does."
                  : "Your clue will appear here once you're released to start."}
              </p>
            )}
          </CardBody>
        </Card>
      ) : null}

      {/* Last scanned stop */}
      <Card>
        <CardHeader title="Last stop you found" />
        <CardBody>
          {progress?.lastFound ? (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">
                  #{progress.lastFound.position + 1}
                </span>
                <span className="text-base font-semibold text-slate-900">
                  {progress.lastFound.name}
                </span>
                <span className="text-xs text-slate-500">
                  at {timeFormat.format(new Date(progress.lastFound.scannedAt))}
                </span>
              </div>
              <p className="whitespace-pre-line text-sm text-slate-600">
                “{progress.lastFound.hint}”
              </p>
              {progress.lastFound.location ? (
                <p className="text-xs text-slate-500">
                  📍 {progress.lastFound.location.latitude}, {progress.lastFound.location.longitude}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nothing scanned yet - follow your first clue!</p>
          )}
        </CardBody>
      </Card>

      {/* Manual code entry */}
      {progress && !progress.complete && game.status !== "finished" ? (
        <Card>
          <CardHeader
            title="Found a code?"
            description="Type the code printed under the QR if scanning is tricky."
          />
          <CardBody className="space-y-3">
            {notice ? (
              <div
                role="status"
                className={`rounded-md border px-3 py-2 text-sm ${
                  notice.result === "accepted" || notice.result === "wildcard"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : isRetryableScanResult(notice.result)
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                {notice.stopName ? <strong>{notice.stopName}: </strong> : null}
                {notice.message}
              </div>
            ) : null}
            <form onSubmit={handleSubmitCode} className="flex gap-2">
              <label htmlFor="scan-code" className="sr-only">
                Code
              </label>
              <Input
                id="scan-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="e.g. Ab3xY9qR"
                autoComplete="off"
                spellCheck={false}
                maxLength={16}
                className="font-mono tracking-widest"
              />
              <Button type="submit" disabled={busy || !code.trim()}>
                {busy ? "Checking…" : "Submit"}
              </Button>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {/* Scan history */}
      {team ? (
        <Card>
          <CardHeader title="Scan history" description="Every code your team has scanned." />
          <CardBody className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-slate-500">No scans yet - they&apos;ll show up here.</p>
            ) : (
              <>
                <ol className="divide-y divide-slate-100">
                  {visibleHistory.map((entry) => {
                    const scanner = team.members.find(
                      (member) => member.userId === entry.scannedByUserId,
                    );
                    const scannerName = scanner ? (scanner.isYou ? "you" : scanner.name) : null;

                    return (
                      <li key={entry.id} className="flex items-center gap-3 py-2 text-sm">
                        <span className="w-6 shrink-0 text-right text-xs font-semibold text-slate-400">
                          {entry.isWildcard
                            ? "★"
                            : entry.position !== null
                              ? `#${entry.position + 1}`
                              : ""}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-slate-900">
                            {entry.stopName ?? "Unknown stop"}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {timeFormat.format(new Date(entry.scannedAt))}
                            {scannerName ? ` · by ${scannerName}` : ""}
                          </span>
                        </span>
                        <span className={historyPillClass(entry.result)}>
                          {HISTORY_RESULT_LABELS[entry.result] ?? entry.result}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                {history.length > HISTORY_PREVIEW_COUNT ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllHistory((current) => !current)}
                  >
                    {showAllHistory ? "Show fewer" : `Show all ${history.length}`}
                  </Button>
                ) : null}
              </>
            )}
          </CardBody>
        </Card>
      ) : null}

      {/* Leaderboard */}
      <Card>
        <CardHeader title="Leaderboard" />
        <CardBody>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-slate-500">No players yet.</p>
          ) : (
            <ol className="divide-y divide-slate-100">
              {leaderboard.map((entry) => (
                <li
                  key={entry.teamId}
                  className={`flex items-center gap-3 py-2 text-sm ${entry.isYou ? "font-semibold text-slate-900" : "text-slate-700"}`}
                >
                  <span className="w-6 text-right text-xs text-slate-400">{entry.rank}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {entry.name}
                    {entry.isYou ? " (you)" : ""}
                  </span>
                  {entry.wildcardFound ? <span title="Wildcard found">★</span> : null}
                  <span className="text-xs text-slate-500">
                    {entry.found}/{entry.total}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </Shell>
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">{children}</main>
  );
}

function ordinal(n: number): string {
  const suffixes: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };
  const v = n % 100;

  return `${n}${v >= 11 && v <= 13 ? "th" : (suffixes[n % 10] ?? "th")}`;
}
