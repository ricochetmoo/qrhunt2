"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ErrorMessage, Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { signIn } from "@/lib/auth-client";
import { GAME_MODE_PLAYER_BLURBS, isGameMode } from "@/lib/game-mode";
import { detectScanContext, type ScanContext } from "@/lib/scan-context";

import { FinishLine } from "./finish-line-client";
import { SCAN_RESULT_MESSAGES, isRetryableScanResult, type ScanResult } from "@/lib/scan-results";

const ONBOARDED_KEY = "qr-hunt:onboarded";
const ACTIVE_GAME_KEY = "qr-hunt:active-game";
const LANDING_SCAN_KEY_PREFIX = "qr-hunt:landing-scan:";
/** Reloading this page soon after landing replays the same scan rather than logging a second one. */
const LANDING_SCAN_REUSE_MS = 2 * 60_000;

/** The funnel has no offline queue, so retryable outcomes ask for a re-scan instead. */
const FUNNEL_SCAN_MESSAGES: Partial<Record<ScanResult, string>> = {
  not_started: "The game hasn't started yet - scan this poster again once it has.",
  paused: "The game is paused - scan this poster again when it resumes.",
};

/** What the player is shown after the poster they scanned has been logged. */
type ScanView = {
  result: ScanResult;
  message: string;
  stopName: string | null;
  funFact: string | null;
  found: number;
  total: number;
  complete: boolean;
  hintsReleased: boolean;
  nextHint: string | null;
};

type Joined = {
  /** Already enrolled before this visit (a later poster on the route). */
  returning?: boolean;
  message: string | null;
  playerName?: string | null;
  teamCode?: string | null;
  scan?: ScanView | null;
};

type Resolved = {
  found: boolean;
  /**
   * "stop" = poster QR payload; "game" = 6-char game code; "team" = rejoin/team
   * code; "completion" = the "I'm done" finish-line code (handled by FinishLine).
   */
  kind?: "stop" | "game" | "team" | "completion";
  game?: {
    id: string;
    name: string;
    status: string;
    mode: string;
    allowOutOfOrder?: boolean;
    joinable: boolean;
    routeSignupEnabled: boolean;
    allowSelfSignup: boolean;
  };
  stop?: { name: string } | null;
  viewer?: {
    signedIn: boolean;
    named: boolean;
    name: string | null;
    enrolled: boolean;
    teamName: string | null;
  };
};

type Stage =
  | "loading"
  | "notfound"
  | "onboard" // ask the name
  | "rescan" // name saved; close and re-scan to prove persistence
  | "welcome-back" // recognised on a later scan
  | "throwaway" // this context won't remember the player
  | "joined"; // start-the-game confirmation

function rememberOnboarded(gameId: string) {
  try {
    window.localStorage.setItem(ONBOARDED_KEY, JSON.stringify({ gameId, at: new Date().toISOString() }));
  } catch {
    // Storage may be unavailable; the server session is what matters.
  }
}

function rememberActiveGame(gameId: string, name: string) {
  try {
    window.localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify({ gameId, name }));
  } catch {
    // convenience only
  }
}

/**
 * Route complete: the game screen takes over (completion message and badge
 * instructions), so the scan outcome is not shown here. `replace` keeps this
 * landing out of history; coming back would only log the poster again.
 */
function openGame(gameId: string) {
  window.location.replace(`/play/${gameId}`);
}

/**
 * Idempotency key for the scan this landing represents. A reload or
 * back-navigation within a couple of minutes reuses it, so the server replays
 * the stored outcome instead of logging a duplicate; a genuine later re-scan
 * gets a fresh id so a previously out-of-order stop can still be credited.
 */
function landingScanId(code: string): string {
  const key = `${LANDING_SCAN_KEY_PREFIX}${code}`;

  try {
    const raw = window.sessionStorage.getItem(key);

    if (raw) {
      const stored = JSON.parse(raw) as { id?: string; at?: number };

      if (stored.id && stored.at && Date.now() - stored.at < LANDING_SCAN_REUSE_MS) {
        return stored.id;
      }
    }
  } catch {
    // storage unavailable; fall through to a fresh id
  }

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `landing-${Date.now()}`;

  try {
    window.sessionStorage.setItem(key, JSON.stringify({ id, at: Date.now() }));
  } catch {
    // storage unavailable
  }

  return id;
}

function ScanOutcome({ scan }: { scan: ScanView }) {
  const credited = scan.result === "accepted" || scan.result === "wildcard";
  const tone = credited
    ? "border-green-200 bg-green-50 text-green-800"
    : isRetryableScanResult(scan.result)
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className="space-y-3">
      <div role="status" className={`rounded-md border px-3 py-2 text-sm ${tone}`}>
        {scan.stopName ? <strong>{scan.stopName}: </strong> : null}
        {scan.message}
      </div>
      {scan.funFact ? (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="font-semibold">Fun fact:</span>{" "}
          <span className="whitespace-pre-line">{scan.funFact}</span>
        </p>
      ) : null}
      {credited && scan.total > 0 ? (
        <p className="text-sm text-slate-600">
          {scan.found} of {scan.total} stops found.
        </p>
      ) : null}
      {scan.hintsReleased && scan.nextHint ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your next clue</p>
          <p className="mt-1 whitespace-pre-line text-base text-slate-900">“{scan.nextHint}”</p>
        </div>
      ) : null}
    </div>
  );
}

function CameraAdvice({ context }: { context: ScanContext | null }) {
  if (!context || context.platform !== "ios") {
    return null;
  }

  if (context.inAppWebView) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        ⚠️ It looks like you scanned this with the <strong>Control Centre code scanner</strong> or
        an app&apos;s built-in scanner. That scanner forgets you every time. Close this, open the
        normal <strong>Camera app</strong>, and scan the poster again.
      </div>
    );
  }

  return null;
}

export function JoinFunnel({ code }: { code: string }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [scanContext, setScanContext] = useState<ScanContext | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState<Joined | null>(null);

  /** Log the poster this page represents as a scan for the player's team. Null on network/API failure. */
  const submitScan = useCallback(
    async (gameId: string): Promise<ScanView | null> => {
      const response = await apiClient.api.player.games[":gameId"].scans.sync.$post({
        param: { gameId },
        json: {
          scans: [{ clientScanId: landingScanId(code), code, scannedAt: new Date().toISOString() }],
        },
      });

      if (!response.ok) {
        return null;
      }

      const { results, state } = await response.json();
      const [outcome] = results;
      const progress = state.progress;

      return {
        result: outcome.result,
        message:
          FUNNEL_SCAN_MESSAGES[outcome.result] ??
          SCAN_RESULT_MESSAGES[outcome.result] ??
          outcome.message,
        stopName: outcome.qrCodeName,
        funFact: outcome.funFact,
        found: progress?.found ?? 0,
        total: progress?.total ?? 0,
        complete: progress?.complete ?? false,
        hintsReleased: progress?.hintsReleased ?? false,
        nextHint: progress?.nextHint ?? null,
      };
    },
    [code],
  );

  const resolve = useCallback(async () => {
    setStage("loading");
    setError(null);

    try {
      const response = await fetch(`/api/player/resolve/${encodeURIComponent(code)}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as Resolved;

      setResolved(data);

      if (!data.found || !data.game) {
        setStage("notfound");
        return;
      }

      if (data.viewer?.signedIn && data.viewer.named) {
        // The close-and-rescan check has effectively passed: this context
        // remembered the identity across visits.
        if (data.viewer.enrolled && data.kind === "stop") {
          // Already playing, so this poster scan IS the scan: log it and show
          // the outcome and next clue without a detour through "join".
          const scan = await submitScan(data.game.id).catch(() => null);

          if (scan) {
            rememberActiveGame(data.game.id, data.game.name);

            if (scan.complete) {
              openGame(data.game.id);
              return;
            }

            setJoined({ returning: true, message: null, playerName: data.viewer.name, scan });
            setStage("joined");
            return;
          }

          setError("Couldn't log this stop. Check your signal and try again.");
        }

        setStage("welcome-back");
      } else {
        setStage("onboard");
      }
    } catch {
      setError("Could not reach the game. Check your signal and try again.");
      setStage("onboard");
    }
  }, [code, submitScan]);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        Boolean((window.navigator as { standalone?: boolean }).standalone));

    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only context detection
    setScanContext(detectScanContext(navigator.userAgent, { standalone }));
    void resolve();
  }, [resolve]);

  async function handleOnboard(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      // Mint the identity if this context doesn't hold one yet.
      if (!resolved?.viewer?.signedIn) {
        const minted = await signIn.anonymous();

        if (minted.error) {
          setError(minted.error.message ?? "Could not get you signed in. Try again.");
          return;
        }
      }

      const saved = await fetch("/api/player/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!saved.ok) {
        setError("Could not save your name. Try again.");
        return;
      }

      // Persistence probe: if the session cookie doesn't echo straight back,
      // this context is throwaway and the close-and-rescan check would fail —
      // tell the player now instead of sending them in a circle.
      const echo = await fetch("/api/me", { cache: "no-store" });

      if (!echo.ok) {
        setStage("throwaway");
        return;
      }

      if (resolved?.game) {
        rememberOnboarded(resolved.game.id);
      }

      setStage("rescan");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Teams are one player: the name given at onboarding is the team name, and
   * the auto-created team's code doubles as the player's personal rejoin code.
   * Once the team exists, the poster that brought the player here is logged
   * as their first scan, so the stop they are standing at counts.
   */
  async function handleStart() {
    if (!resolved?.game) return;

    const game = resolved.game;
    const wasEnrolled = resolved.viewer?.enrolled ?? false;
    setError(null);
    setBusy(true);

    try {
      const playerName = resolved.viewer?.name ?? name.trim() ?? null;
      let teamCode: string | null = null;

      if (!wasEnrolled) {
        const joinBody =
          resolved.kind === "game"
            ? { gameCode: code }
            : resolved.kind === "team"
              ? { teamCode: code }
              : { qrCode: code };
        const joinResponse = await fetch("/api/player/join", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(joinBody),
        });

        if (!joinResponse.ok) {
          const body = (await joinResponse.json().catch(() => null)) as { code?: string } | null;

          if (body?.code === "ROUTE_SIGNUP_DISABLED" || body?.code === "SELF_SIGNUP_DISABLED") {
            setJoined({
              message:
                "This game doesn't allow joining from a poster. Ask your leader for the game code.",
            });
            setStage("joined");
            return;
          }

          if (body?.code === "GAME_NOT_JOINABLE") {
            setJoined({ message: "This game isn't open for new players right now." });
            setStage("joined");
            return;
          }

          setError("Something went wrong starting the game. Try again.");
          return;
        }

        type JoinState = { state?: { team?: { name: string; teamCode: string } | null } };
        let team = ((await joinResponse.json().catch(() => null)) as JoinState | null)?.state?.team;

        // Solo-team model: silently create the player's one-person team,
        // proving capability with whichever code brought them here.
        if (!team) {
          const teamResponse = await fetch(`/api/player/games/${game.id}/team`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              action: "create",
              name: playerName || undefined,
              ...(resolved.kind === "game" ? { gameCode: code } : { qrCode: code }),
            }),
          });

          if (teamResponse.ok) {
            team = ((await teamResponse.json().catch(() => null)) as JoinState | null)?.state?.team;
          } else {
            const body = (await teamResponse.json().catch(() => null)) as { code?: string } | null;

            if (body?.code !== "ALREADY_IN_TEAM") {
              setJoined({
                message:
                  "You're checked in, but couldn't be entered into the game automatically. Ask your leader for help.",
                playerName,
              });
              setStage("joined");
              return;
            }
          }
        }

        teamCode = team?.teamCode ?? null;
      }

      rememberActiveGame(game.id, game.name);

      // A poster brought them here: log that stop now.
      const scan = resolved.kind === "stop" ? await submitScan(game.id).catch(() => null) : null;

      if (scan?.complete) {
        openGame(game.id);
        return;
      }

      setJoined({
        returning: wasEnrolled,
        message:
          resolved.kind !== "stop"
            ? "You're in - open your game for your first clue."
            : scan
              ? null
              : "You're in, but this stop couldn't be logged. Open your game and type the code printed on the poster.",
        playerName,
        teamCode,
        scan,
      });
      setStage("joined");
    } finally {
      setBusy(false);
    }
  }

  const game = resolved?.game;
  const viewer = resolved?.viewer;

  // The finish-line code has its own flow: feedback then check-in, never join.
  if (resolved?.kind === "completion" && game) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-4 px-4 py-8">
        <CameraAdvice context={scanContext} />
        <FinishLine code={code} game={game} viewer={viewer} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-4 px-4 py-8">
      <CameraAdvice context={scanContext} />
      <ErrorMessage message={error} />

      {stage === "loading" ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">Checking this code…</p>
          </CardBody>
        </Card>
      ) : null}

      {stage === "notfound" ? (
        <Card>
          <CardBody className="space-y-2">
            <h1 className="text-lg font-semibold text-slate-900">Hmm, that code isn&apos;t part of a game</h1>
            <p className="text-sm text-slate-600">
              Double-check you scanned a QR Hunt poster, or ask your leader for help.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {stage === "onboard" && game ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Welcome to {game.name}!</h1>
              <p className="mt-1 text-sm text-slate-600">
                {resolved?.stop ? (
                  <>
                    You found <strong>{resolved.stop.name}</strong>. Let&apos;s get you into the game.
                  </>
                ) : resolved?.kind === "team" ? (
                  <>Your rejoin code worked. Let&apos;s get you back into the game.</>
                ) : (
                  <>Your game code worked. Let&apos;s get you into the game.</>
                )}
              </p>
              {isGameMode(game.mode) ? (
                <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {GAME_MODE_PLAYER_BLURBS[game.mode]}
                  {game.allowOutOfOrder ? " Stops can be found in any order." : ""}
                </p>
              ) : null}
            </div>
            <form onSubmit={handleOnboard} className="space-y-3">
              <Field label="What's your first name?" htmlFor="player-name">
                <Input
                  id="player-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={50}
                  autoFocus
                  autoComplete="given-name"
                />
              </Field>
              <Button type="submit" disabled={busy || !name.trim()} className="w-full">
                {busy ? "Saving…" : "Save my name"}
              </Button>
            </form>
            <button
              type="button"
              onClick={() => setStage("throwaway")}
              className="w-full text-center text-xs text-slate-500 underline"
            >
              Already gave your name? Expected to still be here?
            </button>
          </CardBody>
        </Card>
      ) : null}

      {stage === "rescan" && game ? (
        <Card>
          <CardBody className="space-y-3">
            <h1 className="text-xl font-semibold text-slate-900">Nice to meet you, {name.trim()}! 👋</h1>
            <p className="text-sm text-slate-700">
              One quick check before the game starts:
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
              <li>Close this page completely.</li>
              <li>
                Open the <strong>Camera app</strong> and scan the poster again.
              </li>
            </ol>
            <p className="text-sm text-slate-700">
              If your phone remembers you, the game begins. On iPhone, use the normal{" "}
              <strong>Camera app</strong> - not the Control Centre code scanner, which forgets you.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {stage === "welcome-back" && game && viewer ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Welcome back, {viewer.name}! ✅
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Your phone remembers you{viewer.teamName ? ` - team ${viewer.teamName}` : ""}.
                {resolved?.stop ? (
                  <>
                    {" "}
                    You found <strong>{resolved.stop.name}</strong>.
                  </>
                ) : null}
              </p>
            </div>
            {viewer.enrolled && resolved?.kind !== "stop" ? (
              <a
                href={`/play/${game.id}`}
                className="block w-full rounded-md bg-slate-900 px-3.5 py-2 text-center text-sm font-medium text-white hover:bg-slate-700"
              >
                Back to the game →
              </a>
            ) : (
              <Button onClick={handleStart} disabled={busy} className="w-full">
                {busy
                  ? viewer.enrolled
                    ? "Logging…"
                    : "Starting…"
                  : viewer.enrolled
                    ? "Log this stop"
                    : "Start the game"}
              </Button>
            )}
          </CardBody>
        </Card>
      ) : null}

      {stage === "joined" && game ? (
        <Card>
          <CardBody className="space-y-3">
            <h1 className="text-lg font-semibold text-slate-900">
              {joined?.playerName
                ? joined.returning
                  ? `Welcome back, ${joined.playerName}! ✅`
                  : `You're checked in, ${joined.playerName}! 🎉`
                : game.name}
            </h1>
            {joined?.scan ? <ScanOutcome scan={joined.scan} /> : null}
            {joined?.message ? <p className="text-sm text-slate-700">{joined.message}</p> : null}
            {isGameMode(game.mode) && !joined?.returning ? (
              <p className="text-sm text-slate-600">{GAME_MODE_PLAYER_BLURBS[game.mode]}</p>
            ) : null}
            {joined?.teamCode && !joined.returning ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                🎖 There&apos;s a badge in it for you! Find every stop to complete the hunt, then
                head to the Digital Team tent to collect it.
              </p>
            ) : null}
            {joined?.teamCode ? (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Your rejoin code:{" "}
                <code className="font-mono text-base font-semibold tracking-widest">{joined.teamCode}</code>
                <span className="mt-1 block text-xs text-slate-500">
                  If you switch phones, scan any poster and use this code to carry on.
                </span>
              </p>
            ) : null}
            {joined?.teamCode || joined?.playerName ? (
              <a
                href={`/play/${game.id}`}
                className="block w-full rounded-md bg-slate-900 px-3.5 py-2 text-center text-sm font-medium text-white hover:bg-slate-700"
              >
                Open your game →
              </a>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {stage === "throwaway" ? (
        <Card>
          <CardBody className="space-y-3">
            <h1 className="text-lg font-semibold text-slate-900">This scanner forgets you 😔</h1>
            <p className="text-sm text-slate-700">
              Some scanners (like the iPhone <strong>Control Centre code scanner</strong> and
              scanners inside other apps) throw everything away when they close - so the game
              can&apos;t remember who you are.
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
              <li>Close this page.</li>
              <li>
                Open the normal <strong>Camera app</strong>.
              </li>
              <li>Point it at the poster and tap the yellow link.</li>
            </ol>
            <p className="text-sm text-slate-700">
              Still stuck? Open <strong>Safari</strong> and type the address printed on the poster.
            </p>
            <Button variant="secondary" onClick={resolve} disabled={busy} className="w-full">
              I&apos;ve re-scanned - check again
            </Button>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
