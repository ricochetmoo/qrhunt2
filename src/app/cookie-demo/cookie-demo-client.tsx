"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { signIn } from "@/lib/auth-client";

const DEVICE_KEY = "qr-hunt:cookie-demo:device";
const TAB_KEY = "qr-hunt:cookie-demo:tab";

type SessionInfo =
  | { status: "checking" }
  | { status: "none" }
  | { status: "error"; message: string }
  | { status: "active"; userId: string; email: string; createdAt: string };

type Marker = { id: string; firstSeen: string };

type ProbeStep = "pass" | "fail" | "skipped";

type ProbeResult = {
  verdict: "keeps" | "throwaway";
  cookieWrite: ProbeStep;
  localStorageWrite: ProbeStep;
  sessionRoundTrip: ProbeStep;
  usedExistingSession: boolean;
  detail: string;
};

/** Synchronous check: can this context write and read back a JS cookie at all? */
function probeCookieWrite(): ProbeStep {
  try {
    const name = "qr-hunt-probe";
    document.cookie = `${name}=1; path=/; max-age=60`;
    const ok = document.cookie.includes(`${name}=1`);
    document.cookie = `${name}=; path=/; max-age=0`;

    return ok ? "pass" : "fail";
  } catch {
    return "fail";
  }
}

function probeLocalStorageWrite(): ProbeStep {
  try {
    window.localStorage.setItem("qr-hunt-probe", "1");
    const ok = window.localStorage.getItem("qr-hunt-probe") === "1";
    window.localStorage.removeItem("qr-hunt-probe");

    return ok ? "pass" : "fail";
  } catch {
    return "fail";
  }
}

function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function randomId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Read-or-create a marker in a storage area; returns null when storage is unavailable. */
function ensureMarker(storage: Storage | null): Marker | null {
  if (!storage) return null;

  try {
    const existing = storage.getItem(DEVICE_KEY);

    if (existing) {
      return JSON.parse(existing) as Marker;
    }

    const marker: Marker = { id: randomId(), firstSeen: new Date().toISOString() };
    storage.setItem(DEVICE_KEY, JSON.stringify(marker));

    return marker;
  } catch {
    return null;
  }
}

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-b border-slate-100 py-1.5 last:border-b-0">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`text-sm text-slate-900 ${mono ? "font-mono text-xs" : ""} break-all text-right`}>
        {value}
      </dd>
    </div>
  );
}

export function CookieDemo() {
  const [session, setSession] = useState<SessionInfo>({ status: "checking" });
  const [env, setEnv] = useState<{
    device: Marker | null;
    tab: Marker | null;
    context: Record<string, string>;
    pageUrl: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState<ProbeResult | "running" | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const device = env?.device ?? null;
  const tab = env?.tab ?? null;

  const addLog = useCallback((message: string) => {
    setLog((current) => [`${new Date().toLocaleTimeString()} - ${message}`, ...current].slice(0, 20));
  }, []);

  const checkSession = useCallback(async () => {
    setSession({ status: "checking" });

    try {
      const response = await fetch("/api/me", { cache: "no-store" });

      if (response.status === 401) {
        setSession({ status: "none" });
        addLog("Checked session: none in this context.");
        return;
      }

      if (!response.ok) {
        setSession({ status: "error", message: `HTTP ${response.status}` });
        return;
      }

      const { user } = (await response.json()) as {
        user: { id: string; email: string; createdAt: string };
      };
      setSession({ status: "active", userId: user.id, email: user.email, createdAt: user.createdAt });
      addLog(`Checked session: user ${shortId(user.id)}.`);
    } catch (error) {
      setSession({ status: "error", message: error instanceof Error ? error.message : "failed" });
    }
  }, [addLog]);

  useEffect(() => {
    const standaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone =
      "standalone" in window.navigator &&
      Boolean((window.navigator as { standalone?: boolean }).standalone);

    // Mount-only browser context detection; SSR renders the null placeholder by design.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv({
      device: ensureMarker(window.localStorage),
      tab: ensureMarker(window.sessionStorage),
      pageUrl: window.location.href,
      context: {
        "User agent": navigator.userAgent,
        "Display mode": standaloneMedia || iosStandalone ? "standalone (installed PWA)" : "browser tab",
        "Cookies enabled": String(navigator.cookieEnabled),
        Referrer: document.referrer || "(none - typical for camera/QR entry)",
        "Visible cookies (non-HttpOnly)": document.cookie || "(none visible - the session cookie is HttpOnly)",
        "Opened at": new Date().toLocaleString(),
      },
    });

    void checkSession();

    // QR of this page so you can jump contexts by scanning the screen.
    void import("qrcode").then((QRCode) =>
      QRCode.toDataURL(window.location.href, { width: 220, margin: 1 }).then(setQrDataUrl),
    );
  }, [checkSession]);

  /**
   * The onboarding decision the real /s/[code] funnel will make: is it safe to
   * enrol a player in this context, or is it a throwaway web view (e.g. the
   * iOS Control Centre Code Scanner) that will forget them?
   */
  async function runProbe() {
    setProbe("running");
    setBusy(true);

    try {
      const cookieWrite = probeCookieWrite();
      const localStorageWrite = probeLocalStorageWrite();
      let sessionRoundTrip: ProbeStep = "skipped";
      let usedExistingSession = false;
      let detail = "";

      // Prefer evidence from an existing session: if one echoes back, the
      // HttpOnly cookie is being stored and sent.
      const existing = await fetch("/api/me", { cache: "no-store" });

      if (existing.ok) {
        sessionRoundTrip = "pass";
        usedExistingSession = true;
      } else {
        const minted = await signIn.anonymous();

        if (minted.error) {
          sessionRoundTrip = "fail";
          detail = `Anonymous sign-in failed: ${minted.error.message ?? "unknown error"}.`;
        } else {
          const echo = await fetch("/api/me", { cache: "no-store" });
          sessionRoundTrip = echo.ok ? "pass" : "fail";

          if (!echo.ok) {
            detail = "Sign-in succeeded but the session cookie did not come back on the next request.";
          }
        }

        await checkSession();
      }

      const keeps = sessionRoundTrip === "pass" && cookieWrite === "pass";
      setProbe({
        verdict: keeps ? "keeps" : "throwaway",
        cookieWrite,
        localStorageWrite,
        sessionRoundTrip,
        usedExistingSession,
        detail,
      });
      addLog(`Probe verdict: this context ${keeps ? "keeps you" : "is throwaway"}.`);
    } catch (error) {
      setProbe({
        verdict: "throwaway",
        cookieWrite: "fail",
        localStorageWrite: "fail",
        sessionRoundTrip: "fail",
        usedExistingSession: false,
        detail: error instanceof Error ? error.message : "Probe crashed.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function mintSession() {
    setBusy(true);

    try {
      const result = await signIn.anonymous();

      if (result.error) {
        addLog(`Anonymous sign-in failed: ${result.error.message ?? "unknown error"}`);
      } else {
        addLog("Minted a new anonymous identity in this context.");
      }
    } finally {
      setBusy(false);
      await checkSession();
    }
  }

  function resetStorage() {
    try {
      window.localStorage.removeItem(DEVICE_KEY);
      window.sessionStorage.removeItem(TAB_KEY);
    } catch {
      // ignore
    }
    setEnv((current) =>
      current
        ? {
            ...current,
            device: ensureMarker(window.localStorage),
            tab: ensureMarker(window.sessionStorage),
          }
        : current,
    );
    addLog("Cleared and re-created the storage markers.");
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <PageHeader
        title="Cookie context demo"
        description="Open this page from different scan paths and compare the panels. Matching values mean the contexts share state; differing values mean the context is isolated."
      />

      <Card>
        <CardHeader
          title="Persistence probe - should a player onboard here?"
          description="The check the real /s/<code> join page will run. It writes a test cookie and proves the session cookie round-trips. Throwaway contexts (e.g. the iOS Control Centre Code Scanner) fail it."
        />
        <CardBody className="space-y-3">
          {probe === null ? (
            <p className="text-sm text-slate-500">Not run yet. The probe mints an anonymous identity if none exists.</p>
          ) : probe === "running" ? (
            <p className="text-sm text-slate-500">Probing…</p>
          ) : (
            <>
              <p
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  probe.verdict === "keeps"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                {probe.verdict === "keeps"
                  ? "✅ This context keeps you - safe to onboard players here."
                  : "⚠️ This context looks throwaway - don't onboard here. The join page would show: “Open Safari and go to the game address printed on the poster.”"}
              </p>
              <dl>
                <Row label="JS cookie write/read" value={probe.cookieWrite} mono={false} />
                <Row label="localStorage write/read" value={probe.localStorageWrite} mono={false} />
                <Row
                  label="Session cookie round-trip"
                  value={
                    probe.sessionRoundTrip + (probe.usedExistingSession ? " (existing session)" : " (freshly minted)")
                  }
                  mono={false}
                />
                {probe.detail ? <Row label="Detail" value={probe.detail} mono={false} /> : null}
              </dl>
              <p className="text-xs text-slate-500">
                A pass here can’t prove survival after this view closes: close this scanner, scan the
                QR again, and compare the user ID in the panel below - a changed ID means the context
                discarded the session on close.
              </p>
            </>
          )}
          <Button size="sm" onClick={runProbe} disabled={busy || probe === "running"}>
            {probe && probe !== "running" ? "Run probe again" : "Run persistence probe"}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="1 · Server identity (the cookie test)"
          description="Backed by the HttpOnly Better Auth session cookie via /api/me. Same user ID across two contexts ⇒ they share cookies."
        />
        <CardBody>
          <dl>
            {session.status === "checking" ? <Row label="Status" value="Checking…" mono={false} /> : null}
            {session.status === "none" ? (
              <Row label="Status" value="No session in this context" mono={false} />
            ) : null}
            {session.status === "error" ? <Row label="Status" value={session.message} /> : null}
            {session.status === "active" ? (
              <>
                <Row label="User ID" value={session.userId} />
                <Row label="Email" value={session.email} />
                <Row label="Identity created" value={new Date(session.createdAt).toLocaleString()} mono={false} />
              </>
            ) : null}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={mintSession} disabled={busy || session.status === "checking"}>
              {session.status === "active" ? "Mint replacement identity" : "Mint anonymous identity"}
            </Button>
            <Button size="sm" variant="secondary" onClick={checkSession} disabled={busy}>
              Re-check session
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="2 · Local storage (the device-marker test)"
          description="Created on first visit per storage area. A different device marker means localStorage is not shared with the other context."
        />
        <CardBody>
          <dl>
            <Row label="Device marker (localStorage)" value={device ? shortId(device.id) : "unavailable"} />
            <Row
              label="First seen"
              value={device ? new Date(device.firstSeen).toLocaleString() : "-"}
              mono={false}
            />
            <Row label="Tab marker (sessionStorage)" value={tab ? shortId(tab.id) : "unavailable"} />
          </dl>
          <div className="mt-4">
            <Button size="sm" variant="secondary" onClick={resetStorage}>
              Reset markers
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="3 · This context" />
        <CardBody>
          <dl>
            {Object.entries(env?.context ?? {}).map(([label, value]) => (
              <Row key={label} label={label} value={value} mono={label === "User agent"} />
            ))}
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="4 · Jump contexts"
          description="Scan this with the native camera, an in-app scanner, or open it in an installed PWA - then compare panels 1 and 2 with this screen."
        />
        <CardBody className="flex flex-col items-center gap-3">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR code linking to this page" className="h-52 w-52" />
          ) : (
            <p className="text-sm text-slate-500">Generating QR…</p>
          )}
          <p className="break-all text-center font-mono text-xs text-slate-500">{env?.pageUrl ?? ""}</p>
          <p className="text-center text-xs text-slate-500">
            Expected: iOS camera → Safari shares with Safari tabs; an installed iOS PWA is isolated;
            Android camera/Chrome/WebAPK share; third-party in-app scanners are isolated.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Event log" />
        <CardBody>
          {log.length === 0 ? (
            <p className="text-sm text-slate-500">No events yet.</p>
          ) : (
            <ul className="space-y-1 font-mono text-xs text-slate-600">
              {log.map((entry, index) => (
                <li key={index}>{entry}</li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
