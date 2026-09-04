"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  createInitialPlayerState,
  mockSyncScan,
  normalizePlayerCode,
  type PendingScan,
  type PlayerState,
  type ScanOutcome,
  type ScanSource,
} from "./mock-player-data";
import {
  ScannerStartError,
  startQuaggaScanner,
  type ScannerStatus,
} from "./scanner-adapter";
import { normalizeCodeInput } from "@/lib/player-schemas";

const RETRY_INTERVAL_MS = 5000;
const PENDING_SCANS_KEY = "qr-hunt:pending-scans:v1";
const SCANNER_TARGET_ID = "qr-hunt-scanner-viewport";

type ScanNotice = {
  outcome: ScanOutcome | "offline" | "pending";
  message: string;
  detail: string;
};

const noticeStyles: Record<ScanNotice["outcome"], string> = {
  accepted: "border-green-200 bg-green-50 text-green-800",
  completed: "border-green-200 bg-green-50 text-green-800",
  duplicate: "border-slate-200 bg-slate-50 text-slate-700",
  invalid: "border-amber-200 bg-amber-50 text-amber-900",
  offline: "border-amber-200 bg-amber-50 text-amber-900",
  out_of_order: "border-amber-200 bg-amber-50 text-amber-900",
  paused: "border-amber-200 bg-amber-50 text-amber-900",
  pending: "border-slate-200 bg-slate-50 text-slate-700",
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

export function PlayerGameScreen() {
  const [playerState, setPlayerState] = useState<PlayerState>(() =>
    createInitialPlayerState(),
  );
  const [pendingScans, setPendingScans] = useState<PendingScan[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastNotice, setLastNotice] = useState<ScanNotice | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>("idle");
  const [scannerError, setScannerError] = useState("");

  const playerStateRef = useRef(playerState);
  const pendingScansRef = useRef(pendingScans);
  const isOnlineRef = useRef(isOnline);
  const syncInFlightRef = useRef(false);
  const scannerHandleRef = useRef<{ stop: () => void } | null>(null);
  const lastCameraCodeRef = useRef({ code: "", at: 0 });

  useEffect(() => {
    playerStateRef.current = playerState;
  }, [playerState]);

  useEffect(() => {
    pendingScansRef.current = pendingScans;
  }, [pendingScans]);

  const flushPendingScans = useCallback(async () => {
    const scan = pendingScansRef.current[0];
    if (!scan || syncInFlightRef.current) return;

    syncInFlightRef.current = true;
    setIsSyncing(true);

    const attempt = { ...scan, attempts: scan.attempts + 1 };
    const attemptedQueue = [attempt, ...pendingScansRef.current.slice(1)];
    pendingScansRef.current = attemptedQueue;
    setPendingScans(attemptedQueue);
    savePendingScans(attemptedQueue);

    try {
      const result = await mockSyncScan(attempt, playerStateRef.current);
      const remainingQueue = pendingScansRef.current.filter(
        (queuedScan) => queuedScan.idempotencyKey !== result.idempotencyKey,
      );

      playerStateRef.current = result.state;
      pendingScansRef.current = remainingQueue;
      setPlayerState(result.state);
      setPendingScans(remainingQueue);
      savePendingScans(remainingQueue);
      setLastNotice({
        outcome: result.outcome,
        message: result.message,
        detail: result.detail,
      });
    } catch {
      setLastNotice({
        outcome: "offline",
        message: "Scan saved offline",
        detail: "It will retry automatically when your connection returns.",
      });
    } finally {
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    try {
      const storedQueue = window.localStorage.getItem(PENDING_SCANS_KEY);
      if (storedQueue) {
        const parsedQueue = JSON.parse(storedQueue) as unknown;
        if (Array.isArray(parsedQueue)) {
          pendingScansRef.current = parsedQueue as PendingScan[];
          setPendingScans(pendingScansRef.current);
        }
      }
    } catch {
      window.localStorage.removeItem(PENDING_SCANS_KEY);
    }

    const handleOnline = () => {
      isOnlineRef.current = true;
      setIsOnline(true);
      void flushPendingScans();
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
      setIsOnline(false);
    };

    isOnlineRef.current = navigator.onLine;
    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushPendingScans]);

  useEffect(() => {
    const retryTimer = window.setInterval(() => {
      void flushPendingScans();
    }, RETRY_INTERVAL_MS);
    return () => window.clearInterval(retryTimer);
  }, [flushPendingScans]);

  const handleScan = useCallback(
    (rawCode: string, source: ScanSource) => {
      const code = normalizePlayerCode(rawCode).replace(/\s+/g, "");
      if (!code) {
        setLastNotice({
          outcome: "invalid",
          message: "Enter a code first",
          detail: "A route code is eight letters or numbers.",
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

      const now = new Date().toISOString();
      const scan: PendingScan = {
        idempotencyKey: createIdempotencyKey(),
        code,
        source,
        capturedAt: now,
        queuedAt: now,
        attempts: 0,
      };
      const nextQueue = [...pendingScansRef.current, scan];

      pendingScansRef.current = nextQueue;
      setPendingScans(nextQueue);
      savePendingScans(nextQueue);
      setLastNotice({
        outcome: "pending",
        message: isOnlineRef.current ? "Syncing scan…" : "Scan saved offline",
        detail: isOnlineRef.current
          ? "Checking your route progress."
          : "It will sync automatically when you reconnect.",
      });
      void flushPendingScans();
    },
    [flushPendingScans],
  );

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleScan(manualCode, "manual");
    setManualCode("");
  };

  const startCamera = useCallback(async () => {
    if (scannerHandleRef.current || scannerStatus === "starting") return;

    setScannerError("");
    setScannerStatus("starting");
    try {
      scannerHandleRef.current = await startQuaggaScanner({
        targetId: SCANNER_TARGET_ID,
        onDetected: (code) => handleScan(code, "camera"),
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
  }, [handleScan, scannerStatus]);

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

  const nextLocation = playerState.nextLocation;
  const progressPercent = Math.round(
    (playerState.progress / playerState.routeTotal) * 100,
  );

  return (
    <>
      <header className="flex w-full items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 pb-5 pt-0 text-slate-900 sm:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            {playerState.troopName}
          </p>
          <h1 className="mt-1 text-2xl font-bold">{playerState.gameName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {playerState.progress} of {playerState.routeTotal} signals found ({progressPercent}%)
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

      <main className="mx-auto min-h-screen w-full max-w-xl bg-white px-4 pb-6 pt-6 text-slate-900 sm:px-6">

      <section aria-labelledby="next-location" className="py-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Next signal</p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold" id="next-location">
              {nextLocation?.name ?? "Route complete"}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
              {nextLocation?.hint ?? "You found every signal. Head back to camp."}
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-slate-500">
            {String(Math.min(playerState.progress + 1, playerState.routeTotal)).padStart(2, "0")} / {String(playerState.routeTotal).padStart(2, "0")}
          </span>
        </div>
      </section>

      {lastNotice ? (
        <div className={`mb-4 rounded border p-3 text-sm ${noticeStyles[lastNotice.outcome]}`} role="status">
          <p className="font-semibold">{lastNotice.message}</p>
          <p className="mt-1 text-xs">{lastNotice.detail}</p>
          {pendingScans.length ? <p className="mt-1 text-xs font-semibold">{pendingScans.length} scan pending</p> : null}
        </div>
      ) : null}

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
          <label className="sr-only" htmlFor="manual-code">QR code</label>
          <input
            className="min-h-11 min-w-0 flex-1 rounded border border-slate-300 px-3 text-sm uppercase outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            id="manual-code"
            inputMode="text"
            autoCapitalize="characters"
            maxLength={16}
            pattern="[A-Z0-9]*"
            placeholder="e.g. MOOR6N3B"
            value={manualCode}
            onChange={(event) => setManualCode(normalizeCodeInput(event.target.value))}
          />
          <button className="min-h-11 rounded bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={!manualCode.trim()} type="submit">Submit</button>
        </form>
        <p className="mt-2 text-xs text-slate-500">
          {isSyncing ? "Syncing scan…" : pendingScans.length ? "Saved here and retrying automatically." : "Scans sync immediately when you submit."}
        </p>
      </section>
      </main>
    </>
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
