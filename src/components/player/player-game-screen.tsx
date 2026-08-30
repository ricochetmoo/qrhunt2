"use client";

import type { InferResponseType } from "hono/client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { apiClient } from "@/lib/api-client";
import { readError } from "@/lib/api-errors";
import type { ScanResult } from "@/lib/scan-results";
import { useGeolocation } from "@/lib/use-geolocation";

import {
  ScannerStartError,
  startQuaggaScanner,
  type ScannerStatus,
} from "./scanner-adapter";

const RETRY_INTERVAL_MS = 5000;
const PENDING_SCANS_KEY = "qr-hunt:pending-scans:v1";
const SCANNER_TARGET_ID = "qr-hunt-scanner-viewport";
const PLAYER_GAME_CODE = process.env.NEXT_PUBLIC_PLAYER_GAME_CODE?.trim() ?? "";
const playerGameApi = apiClient.api.player.games[":gameId"];

type JoinResponse = InferResponseType<typeof apiClient.api.player.join.$post, 200>;
type PlayerState = JoinResponse["state"];
type StateResponse = InferResponseType<typeof playerGameApi.state.$get, 200>;
type SyncResponse = InferResponseType<typeof playerGameApi.scans.sync.$post, 200>;
type ApiScanOutcome = SyncResponse["results"][number];

type ScanSource = "camera" | "manual";

type PendingScan = {
  idempotencyKey: string;
  code: string;
  source: ScanSource;
  capturedAt: string;
  queuedAt: string;
  attempts: number;
  latitude?: string;
  longitude?: string;
};

type ScanNotice = {
  outcome: ScanResult | "offline" | "pending" | "error";
  message: string;
  detail: string;
};

const noticeStyles: Record<ScanNotice["outcome"], string> = {
  accepted: "border-green-200 bg-green-50 text-green-800",
  wildcard: "border-green-200 bg-green-50 text-green-800",
  duplicate: "border-slate-200 bg-slate-50 text-slate-700",
  invalid: "border-amber-200 bg-amber-50 text-amber-900",
  offline: "border-amber-200 bg-amber-50 text-amber-900",
  out_of_order: "border-amber-200 bg-amber-50 text-amber-900",
  paused: "border-amber-200 bg-amber-50 text-amber-900",
  not_started: "border-amber-200 bg-amber-50 text-amber-900",
  late: "border-slate-200 bg-slate-50 text-slate-700",
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  error: "border-red-200 bg-red-50 text-red-900",
};

function createIdempotencyKey(): string {
  if (typeof window !== "undefined" && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function savePendingScans(queue: PendingScan[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PENDING_SCANS_KEY, JSON.stringify(queue));
  }
}

function loadPendingScans(): PendingScan[] {
  if (typeof window === "undefined") return [];

  try {
    const storedQueue = window.localStorage.getItem(PENDING_SCANS_KEY);
    if (!storedQueue) return [];

    const parsedQueue: unknown = JSON.parse(storedQueue);
    return Array.isArray(parsedQueue) ? parsedQueue.filter(isPendingScan) : [];
  } catch {
    window.localStorage.removeItem(PENDING_SCANS_KEY);
    return [];
  }
}

function isPendingScan(value: unknown): value is PendingScan {
  if (typeof value !== "object" || value === null) return false;

  const scan = value as Partial<PendingScan>;
  return (
    typeof scan.idempotencyKey === "string" &&
    typeof scan.code === "string" &&
    (scan.source === "camera" || scan.source === "manual") &&
    typeof scan.capturedAt === "string" &&
    typeof scan.queuedAt === "string" &&
    typeof scan.attempts === "number"
  );
}

function normalizePlayerCode(value: string): string {
  const trimmed = value.trim();
  const prefix = "QRHUNT:V1:";

  return trimmed.toUpperCase().startsWith(prefix)
    ? trimmed.slice(prefix.length).trim()
    : trimmed;
}

function formatSyncTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "just now"
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The player API could not be reached.";
}

function scanNotice(outcome: ApiScanOutcome): ScanNotice {
  const detail = outcome.qrCodeName
    ? `${outcome.qrCodeName} · ${outcome.retryable ? "kept in the queue to retry" : "recorded by the game"}.`
    : outcome.retryable
      ? "The scan stays here and will be retried automatically."
      : "The game has recorded this scan attempt.";

  return {
    outcome: outcome.result,
    message: outcome.message,
    detail,
  };
}

export function PlayerGameScreen() {
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [pendingScans, setPendingScans] = useState<PendingScan[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastNotice, setLastNotice] = useState<ScanNotice | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>("idle");
  const [scannerError, setScannerError] = useState("");

  const playerStateRef = useRef<PlayerState | null>(null);
  const pendingScansRef = useRef<PendingScan[]>(pendingScans);
  const isOnlineRef = useRef(true);
  const gameIdRef = useRef("");
  const syncInFlightRef = useRef(false);
  const scannerHandleRef = useRef<{ stop: () => void } | null>(null);
  const lastCameraCodeRef = useRef({ code: "", at: 0 });
  const { request: requestLocation } = useGeolocation();

  const applyPlayerState = useCallback((nextState: PlayerState) => {
    gameIdRef.current = nextState.game.id;
    playerStateRef.current = nextState;
    setPlayerState(nextState);
  }, []);

  const setQueue = useCallback((queue: PendingScan[]) => {
    pendingScansRef.current = queue;
    setPendingScans(queue);
    savePendingScans(queue);
  }, []);

  const getAuthoritativeState = useCallback(async (gameId: string): Promise<PlayerState> => {
    const response = await playerGameApi.state.$get({
      param: { gameId },
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const body: StateResponse = await response.json();
    return body.state;
  }, []);

  const bootstrapPlayer = useCallback(async (): Promise<PlayerState | null> => {
    if (!PLAYER_GAME_CODE) {
      throw new Error("Set NEXT_PUBLIC_PLAYER_GAME_CODE to the seeded game code.");
    }

    const joinResponse = await apiClient.api.player.join.$post({
      json: { gameCode: PLAYER_GAME_CODE },
    });

    if (!joinResponse.ok) {
      throw new Error(await readError(joinResponse));
    }

    const preview: JoinResponse = await joinResponse.json();
    applyPlayerState(preview.state);

    // `/join` can return a locked no-team preview. Only the team member state
    // endpoint is authoritative for play progress, so refresh it when joined.
    if (!preview.state.team) {
      return preview.state;
    }

    const state = await getAuthoritativeState(preview.state.game.id);
    applyPlayerState(state);
    return state;
  }, [applyPlayerState, getAuthoritativeState]);

  const refreshPlayerState = useCallback(async (): Promise<PlayerState | null> => {
    if (!gameIdRef.current || !playerStateRef.current?.team) {
      return bootstrapPlayer();
    }

    const state = await getAuthoritativeState(gameIdRef.current);
    applyPlayerState(state);
    return state;
  }, [applyPlayerState, bootstrapPlayer, getAuthoritativeState]);

  const showError = useCallback((message: string, detail = "The player screen will keep trying.") => {
    setLastNotice({ outcome: "error", message, detail });
  }, []);

  const flushPendingScans = useCallback(async () => {
    const scan = pendingScansRef.current[0];
    const state = playerStateRef.current;
    const gameId = gameIdRef.current;

    if (
      !scan ||
      !state?.team ||
      !state.progress ||
      !gameId ||
      !isOnlineRef.current ||
      syncInFlightRef.current
    ) {
      return;
    }

    syncInFlightRef.current = true;
    setIsSyncing(true);

    const attempt: PendingScan = { ...scan, attempts: scan.attempts + 1 };
    setQueue([attempt, ...pendingScansRef.current.slice(1)]);
    try {
      const response = await playerGameApi.scans.sync.$post({
        param: { gameId },
        json: {
          routeVersion: state.route.version,
          scans: [
            {
              clientScanId: attempt.idempotencyKey,
              code: attempt.code,
              scannedAt: attempt.capturedAt,
              ...(attempt.latitude && { latitude: attempt.latitude }),
              ...(attempt.longitude && { longitude: attempt.longitude }),
            },
          ],
        },
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const body: SyncResponse = await response.json();
      const outcome = body.results.find(
        (result) => result.clientScanId === attempt.idempotencyKey,
      );

      if (!outcome) {
        throw new Error("The player API returned no result for this scan.");
      }

      // The aggregate is authoritative even for paused, not-started, or
      // rejected attempts: it may contain newer progress from another device.
      applyPlayerState(body.state);
      if (outcome.retryable) {
        setQueue(pendingScansRef.current.map((queued) =>
          queued.idempotencyKey === attempt.idempotencyKey ? attempt : queued,
        ));
      } else {
        const remaining = pendingScansRef.current.filter(
          (queued) => queued.idempotencyKey !== attempt.idempotencyKey,
        );
        setQueue(remaining);
      }
      setLastNotice(scanNotice(outcome));
    } catch (error) {
      // A network/API failure has not produced an authoritative outcome. Keep
      // the attempted scan persisted and let reconnect/timer retry it.
      setQueue(pendingScansRef.current.map((queued) =>
        queued.idempotencyKey === attempt.idempotencyKey ? attempt : queued,
      ));
      setLastNotice({
        outcome: "offline",
        message: "Scan saved offline",
        detail: `${errorMessage(error)} It will retry automatically when your connection returns.`,
      });
    } finally {
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, [applyPlayerState, setQueue]);

  useEffect(() => {
    const queueTimer = window.setTimeout(() => {
      const queue = loadPendingScans();
      if (queue.length > 0) setQueue(queue);
    }, 0);

    const online = navigator.onLine;
    isOnlineRef.current = online;
    const onlineStateTimer = window.setTimeout(() => setIsOnline(online), 0);

    const handleOnline = () => {
      isOnlineRef.current = true;
      setIsOnline(true);
      void refreshPlayerState()
        .catch((error) => showError(errorMessage(error)))
        .finally(() => void flushPendingScans());
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const bootstrapTimer = window.setTimeout(() => {
      void bootstrapPlayer()
        .then(() => flushPendingScans())
        .catch((error) => showError(errorMessage(error), "Check the local game and player configuration."))
        .finally(() => setIsLoading(false));
    }, 0);

    return () => {
      window.clearTimeout(queueTimer);
      window.clearTimeout(onlineStateTimer);
      window.clearTimeout(bootstrapTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [bootstrapPlayer, flushPendingScans, refreshPlayerState, setQueue, showError]);

  useEffect(() => {
    const retryTimer = window.setInterval(() => {
      if (isOnlineRef.current) {
        void refreshPlayerState().catch((error) => showError(errorMessage(error)));
      }
      void flushPendingScans();
    }, RETRY_INTERVAL_MS);

    return () => window.clearInterval(retryTimer);
  }, [flushPendingScans, refreshPlayerState, showError]);

  const handleScan = useCallback(
    async (rawCode: string, source: ScanSource) => {
      const code = normalizePlayerCode(rawCode).replace(/\s+/g, "");
      if (!code) {
        setLastNotice({
          outcome: "error",
          message: "Enter a code first",
          detail: "Enter the human-readable code printed below the poster.",
        });
        return;
      }

      if (!playerStateRef.current?.team || !playerStateRef.current.progress) {
        setLastNotice({
          outcome: "error",
          message: "Join a team before scanning",
          detail: "The game API has not assigned this player to a team yet.",
        });
        return;
      }

      if (source === "camera") {
        const now = Date.now();
        if (
          lastCameraCodeRef.current.code === code &&
          now - lastCameraCodeRef.current.at < 1200
        ) {
          return;
        }
        lastCameraCodeRef.current = { code, at: now };
      }

      const capturedAt = new Date().toISOString();
      const location = await requestLocation();
      const queuedAt = new Date().toISOString();
      const scan: PendingScan = {
        idempotencyKey: createIdempotencyKey(),
        code,
        source,
        capturedAt,
        queuedAt,
        attempts: 0,
        ...(location && {
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      };
      const nextQueue = [...pendingScansRef.current, scan];

      setQueue(nextQueue);
      setLastNotice({
        outcome: "pending",
        message: isOnlineRef.current ? "Syncing scan…" : "Scan saved offline",
        detail: isOnlineRef.current
          ? "Checking your route progress."
          : "It will sync automatically when you reconnect.",
      });
      void flushPendingScans();
    },
    [flushPendingScans, requestLocation, setQueue],
  );

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleScan(manualCode, "manual");
    setManualCode("");
  };

  const startCamera = useCallback(async () => {
    if (scannerHandleRef.current || scannerStatus === "starting") return;
    if (!playerStateRef.current?.team) {
      showError("Join a team before starting the camera.");
      return;
    }

    setScannerError("");
    setScannerStatus("starting");
    try {
      scannerHandleRef.current = await startQuaggaScanner({
        targetId: SCANNER_TARGET_ID,
        onDetected: (code) => void handleScan(code, "camera"),
      });
      setScannerStatus("running");
    } catch (error) {
      setScannerStatus(
        error instanceof ScannerStartError ? error.status : "error",
      );
      setScannerError(
        error instanceof Error ? error.message : "The camera could not start.",
      );
    }
  }, [handleScan, scannerStatus, showError]);

  const stopCamera = useCallback(() => {
    scannerHandleRef.current?.stop();
    scannerHandleRef.current = null;
    setScannerStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      scannerHandleRef.current?.stop();
      scannerHandleRef.current = null;
    };
  }, []);

  if (isLoading && !playerState) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-6 text-slate-900 sm:px-6">
        <p className="text-sm text-slate-600">Connecting to the game…</p>
      </main>
    );
  }

  if (!playerState) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-xl bg-white px-4 py-6 text-slate-900 sm:px-6">
        <header className="border-b border-slate-200 pb-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">QR Hunt</p>
          <h1 className="mt-1 text-2xl font-bold">Player setup needed</h1>
        </header>
        {lastNotice ? (
          <div className={`mt-6 rounded border p-3 text-sm ${noticeStyles[lastNotice.outcome]}`} role="alert">
            <p className="font-semibold">{lastNotice.message}</p>
            <p className="mt-1 text-xs">{lastNotice.detail}</p>
          </div>
        ) : null}
      </main>
    );
  }

  const progress = playerState.progress;
  const routeTotal = progress?.total ?? playerState.route.totalCodes;
  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.found / progress.total) * 100)
    : 0;
  const hasTeam = Boolean(playerState.team && progress);
  const nextPosition = progress?.nextPosition;
  const nextLocationName = progress?.nextCodeName ?? "Route complete";
  const nextLocation = nextPosition === null || nextPosition === undefined
    ? null
    : playerState.route.codes[nextPosition];

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl bg-white px-4 py-6 text-slate-900 sm:px-6">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            {playerState.game.status}
          </p>
          <h1 className="mt-1 text-2xl font-bold">{playerState.game.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {hasTeam
              ? `${progress?.found ?? 0} of ${routeTotal} signals found (${progressPercent}%)`
              : "Team setup required"}
          </p>
        </div>
        <div className="relative">
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="min-h-11 rounded border border-slate-300 px-3 text-sm font-semibold"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
          {menuOpen ? (
            <nav
              aria-label="Player menu"
              className="absolute right-0 z-10 mt-2 w-44 rounded border border-slate-200 bg-white p-1 shadow-lg"
              role="menu"
            >
              <MenuItem label="Scan" active onClick={() => setMenuOpen(false)} />
              <MenuItem label="Map" />
              <MenuItem label="Leaderboard" />
              <MenuItem label="Team" />
              <MenuItem label="Settings" />
            </nav>
          ) : null}
        </div>
      </header>

      {playerState.game.status === "paused" ? (
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          <p className="font-semibold">Game paused</p>
          <p className="mt-1">{playerState.game.pauseReason ?? "Scanning will resume when the organiser restarts the game."}</p>
        </div>
      ) : null}

      {lastNotice ? (
        <div className={`mb-4 mt-4 rounded border p-3 text-sm ${noticeStyles[lastNotice.outcome]}`} role="status">
          <p className="font-semibold">{lastNotice.message}</p>
          <p className="mt-1 text-xs">{lastNotice.detail}</p>
          {pendingScans.length ? (
            <p className="mt-1 text-xs font-semibold">
              {pendingScans.length} scan{pendingScans.length === 1 ? "" : "s"} pending
            </p>
          ) : null}
        </div>
      ) : null}

      {!hasTeam ? (
        <section className="mt-6 rounded border border-violet-200 bg-violet-50 p-4" aria-labelledby="team-boundary">
          <h2 className="text-lg font-bold" id="team-boundary">Join or create a team</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            You are in this game, but the server has not assigned you to a team yet.
            {playerState.game.settings.allowTeamCreation
              ? " Team creation and team-code joining are the next step."
              : " Ask an organiser for a team code."}
          </p>
          <p className="mt-2 text-xs text-slate-600">
            Scanning is unavailable until team membership is confirmed by the player API.
          </p>
        </section>
      ) : (
        <>
          <section aria-labelledby="next-location" className="py-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Next signal</p>
            <div className="mt-2 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold" id="next-location">
                  {nextLocationName}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                  {progress?.nextHint ?? "You found every signal. Head back to camp."}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-slate-500">
                {String(nextPosition === null || nextPosition === undefined ? routeTotal : nextPosition + 1).padStart(2, "0")} / {String(routeTotal).padStart(2, "0")}
              </span>
            </div>
            {nextLocation?.location ? (
              <p className="mt-2 text-xs text-slate-500">
                Location unlocked · {nextLocation.location.latitude}, {nextLocation.location.longitude}
              </p>
            ) : null}
          </section>

          <section aria-labelledby="scanner-heading">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" id="scanner-heading">Scan the next QR code</h2>
              <span className="text-xs text-slate-500">{isOnline ? "Online" : "Offline"}</span>
            </div>
            <div className="relative mt-3 h-56 overflow-hidden rounded border-2 border-dashed border-slate-400 bg-slate-100" id={SCANNER_TARGET_ID}>
              <div className="pointer-events-none absolute inset-8 border-2 border-slate-500" />
              {scannerStatus === "running" ? (
                <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-slate-600">Camera active</p>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                  <p className="font-semibold">Camera scanner</p>
                  <p className="text-xs text-slate-500">Frame the next code inside the box.</p>
                  <p className="text-xs text-slate-500">QR posters need a QR-capable scanner; manual entry remains available below.</p>
                  {scannerError ? <p className="text-xs text-amber-800">{scannerError}</p> : null}
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              {scannerStatus === "running" ? (
                <button className="min-h-11 rounded border border-slate-300 px-3 text-sm font-semibold" type="button" onClick={stopCamera}>Stop camera</button>
              ) : (
                <button className="min-h-11 rounded bg-slate-900 px-3 text-sm font-semibold text-white disabled:opacity-50" disabled={scannerStatus === "starting"} type="button" onClick={startCamera}>
                  {scannerStatus === "starting" ? "Starting camera…" : "Start camera"}
                </button>
              )}
            </div>
          </section>

          <section aria-labelledby="manual-heading" className="mt-8 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-bold" id="manual-heading">Enter a code manually</h2>
            <form className="mt-3 flex gap-2" onSubmit={handleManualSubmit}>
              <label className="sr-only" htmlFor="manual-code">QR code or poster payload</label>
              <input
                className="min-h-11 min-w-0 flex-1 rounded border border-slate-300 px-3 text-sm uppercase outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                id="manual-code"
                inputMode="text"
                maxLength={2048}
                placeholder="e.g. MOOR6N3B"
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
              />
              <button className="min-h-11 rounded bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={!manualCode.trim()} type="submit">Submit</button>
            </form>
            <p className="mt-2 text-xs text-slate-500">
              {isSyncing ? "Syncing scan…" : pendingScans.length ? "Saved here and retrying automatically." : "Scans sync immediately when you submit."}
            </p>
          </section>

          <section className="mt-8 border-t border-slate-200 pt-6" aria-labelledby="team-heading">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Your team</p>
                <h2 className="mt-1 text-lg font-bold" id="team-heading">{playerState.team?.name}</h2>
                <p className="mt-1 text-sm text-slate-600">Team code: <span className="font-semibold tracking-wider">{playerState.team?.teamCode}</span></p>
              </div>
              <p className="text-right text-xs text-slate-500">{playerState.team?.members.length ?? 0} member{playerState.team?.members.length === 1 ? "" : "s"}</p>
            </div>
          </section>

          <section className="mt-8 border-t border-slate-200 pt-6" aria-labelledby="leaderboard-heading">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" id="leaderboard-heading">Leaderboard</h2>
              <span className="text-xs text-slate-500">Synced {formatSyncTime(playerState.serverTime)}</span>
            </div>
            <ol className="mt-3 space-y-2">
              {playerState.leaderboard.map((entry) => (
                <li className={`flex items-center justify-between rounded px-3 py-2 text-sm ${entry.isYou ? "bg-violet-50 font-semibold" : "bg-slate-50"}`} key={entry.teamId}>
                  <span>{entry.rank}. {entry.name}{entry.isYou ? " · you" : ""}</span>
                  <span>{entry.found} / {entry.total}</span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </main>
  );
}

function MenuItem({ label, active = false, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      aria-disabled={!active}
      className="flex min-h-10 w-full items-center justify-between rounded px-3 text-left text-sm hover:bg-slate-100 disabled:cursor-default disabled:opacity-60"
      disabled={!active}
      role="menuitem"
      type="button"
      onClick={onClick}
    >
      <span>{label}</span>
      {!active ? <span className="text-xs text-slate-400">Soon</span> : null}
    </button>
  );
}
