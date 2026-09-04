"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button, Field, Input, Message, ScoutsCard, ScoutsLink, Textarea } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { readError } from "@/lib/api-errors";
import { FUN_SCORE_MAX, FUN_SCORE_MIN } from "@/lib/player-schemas";

/**
 * The finish line: what the `/s/<code>` page shows when the scanned code is a
 * game's "I'm done" code. Enrolled players with a complete route fill in the
 * fun score and comments (the gate), optionally opt in to keep-updated
 * details, and are checked in for a badge. Games with a feedback URL skip the
 * in-app form: the player confirms with one tap, which records the check-in
 * (so the badge queue knows who to issue to), and is then sent to the external
 * feedback form without coming back. Everyone else is told why not.
 */

type Viewer = {
  signedIn: boolean;
  named: boolean;
  name: string | null;
  enrolled: boolean;
};

type Phase =
  | { kind: "loading" }
  | { kind: "not-playing" }
  | { kind: "incomplete"; found: number; total: number }
  | { kind: "form" }
  /** Feedback URL configured: confirm, record the check-in, then leave for the form. */
  | { kind: "confirm"; feedbackUrl: string }
  | { kind: "redirecting"; feedbackUrl: string }
  | { kind: "done"; reportedAt: string | null; prizeIssuedAt: string | null; already: boolean }
  | { kind: "error"; message: string };

const timeFormat = new Intl.DateTimeFormat("en-GB", { timeStyle: "short" });

const SCORES = Array.from({ length: FUN_SCORE_MAX - FUN_SCORE_MIN + 1 }, (_, i) => FUN_SCORE_MIN + i);

export function FinishLine({
  code,
  game,
  viewer,
}: {
  code: string;
  game: { id: string; name: string };
  viewer: Viewer | undefined;
}) {
  const router = useRouter();
  const enrolled = Boolean(viewer?.signedIn && viewer.enrolled);
  const [phase, setPhase] = useState<Phase>(enrolled ? { kind: "loading" } : { kind: "not-playing" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [funScore, setFunScore] = useState<number | null>(null);
  const [comments, setComments] = useState("");
  const [keepUpdated, setKeepUpdated] = useState(false);
  const [contactName, setContactName] = useState(viewer?.name ?? "");
  const [contactEmail, setContactEmail] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  const load = useCallback(async () => {
    // No state updates before the first await: this runs from an effect.
    try {
      const response = await apiClient.api.player.games[":gameId"].state.$get({
        param: { gameId: game.id },
      });

      if (!response.ok) {
        setPhase({ kind: "not-playing" });
        return;
      }

      const { state } = await response.json();

      if (state.team?.reportedCompletedAt) {
        setPhase({
          kind: "done",
          reportedAt: state.team.reportedCompletedAt,
          prizeIssuedAt: state.team.prizeIssuedAt,
          already: true,
        });
        return;
      }

      if (!state.progress?.complete) {
        setPhase({
          kind: "incomplete",
          found: state.progress?.found ?? 0,
          total: state.progress?.total ?? 0,
        });
        return;
      }

      const feedbackUrl = state.game.feedbackUrl?.trim();

      if (feedbackUrl) {
        setPhase({ kind: "confirm", feedbackUrl });
        return;
      }

      setPhase({ kind: "form" });
    } catch {
      setPhase({
        kind: "error",
        message: "Could not reach the game. Check your signal and try again.",
      });
    }
  }, [game.id]);

  useEffect(() => {
    // Fetch-on-mount: state updates land after the network await, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (enrolled) void load();
  }, [enrolled, load]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (funScore === null || !comments.trim()) return;

    setError(null);
    setBusy(true);

    try {
      const response = await apiClient.api.player.games[":gameId"].complete.$post({
        param: { gameId: game.id },
        json: {
          code,
          funScore,
          comments: comments.trim(),
          keepUpdated,
          contactName: keepUpdated ? contactName.trim() || null : null,
          contactEmail: keepUpdated ? contactEmail.trim() || null : null,
          contactRole: keepUpdated ? contactRole.trim() || null : null,
          additionalInfo: keepUpdated ? additionalInfo.trim() || null : null,
        },
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      const { state } = await response.json();
      setPhase({
        kind: "done",
        reportedAt: state.team?.reportedCompletedAt ?? null,
        prizeIssuedAt: state.team?.prizeIssuedAt ?? null,
        already: false,
      });
    } catch {
      setError("Could not reach the game. Check your signal and try again.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * External-feedback games: record the check-in first, then hand over to the
   * feedback form. `replace` on purpose: the player is not expected back here.
   */
  async function handleComplete(feedbackUrl: string) {
    setError(null);
    setBusy(true);

    try {
      const response = await apiClient.api.player.games[":gameId"].complete.$post({
        param: { gameId: game.id },
        json: { code },
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      setPhase({ kind: "redirecting", feedbackUrl });
      window.location.replace(feedbackUrl);
    } catch {
      setError("Could not reach the game. Check your signal and try again.");
    } finally {
      setBusy(false);
    }
  }

  const firstName = viewer?.name ? `, ${viewer.name}` : "";

  return (
    <ScoutsCard title="Finish line" description={game.name} variant="success">
      <div className="space-y-4">
        {error ? (
          <Message title="Something went wrong" variant="danger">
            {error}
          </Message>
        ) : null}

        {phase.kind === "loading" ? (
          <p className="text-scouts-muted">Checking your hunt…</p>
        ) : null}

        {phase.kind === "error" ? (
          <>
            <Message title="Could not load your hunt" variant="danger">
              {phase.message}
            </Message>
            <Button variant="secondary" onClick={load} className="w-full">
              Try again
            </Button>
          </>
        ) : null}

        {phase.kind === "not-playing" ? (
          <Message title="You&apos;re not playing yet" variant="info">
            <p>
              This is the finish-line code for teams who have completed the hunt. Scan a poster on
              the route to start playing, or use your rejoin code if you switched phones.
            </p>
            <ScoutsLink href="/" className="mt-3 inline-block">
              Go to the start page
            </ScoutsLink>
          </Message>
        ) : null}

        {phase.kind === "incomplete" ? (
          <Message title={`Not quite yet${firstName}!`} variant="warning">
            <p>
              You&apos;ve found <strong>{phase.found}</strong> of <strong>{phase.total}</strong>{" "}
              stops. Come back and scan this code once you&apos;ve found them all.
            </p>
            <Button size="lg" onClick={() => router.push(`/play/${game.id}`)} className="mt-3 w-full">
              Back to your game →
            </Button>
          </Message>
        ) : null}

        {phase.kind === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-scouts-text">🏁 You made it{firstName}!</h2>
              <p className="mt-1 text-scouts-muted">
                Before we check you in for your badge, tell us how it went.
              </p>
            </div>

            <fieldset>
              <legend className="text-base font-bold text-scouts-text">How much fun was it?</legend>
              <p className="mt-0.5 text-sm text-scouts-muted">
                {FUN_SCORE_MIN} = not much, {FUN_SCORE_MAX} = the best
              </p>
              <div className="mt-2 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Fun score">
                {SCORES.map((score) => {
                  const selected = funScore === score;

                  return (
                    <Button
                      key={score}
                      type="button"
                      variant={selected ? "primary" : "grey"}
                      outline={!selected}
                      className="h-11 w-full"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setFunScore(score)}
                    >
                      {score}
                    </Button>
                  );
                })}
              </div>
            </fieldset>

            <Field
              label="Your thoughts"
              htmlFor="finish-comments"
              hint="How was the hunt? And what would you like to see, add or change in the world of Scouts Digital?"
            >
              <Textarea
                id="finish-comments"
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                required
                maxLength={2000}
                rows={4}
              />
            </Field>

            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-scouts-border text-scouts-primary focus:ring-scouts-focus"
                checked={keepUpdated}
                onChange={(event) => setKeepUpdated(event.target.checked)}
              />
              <span className="text-base text-scouts-text">
                Keep me updated about future hunts and what the Digital Team is up to
                <span className="block text-sm text-scouts-muted">
                  Optional. We&apos;ll only use these details to keep you updated.
                </span>
              </span>
            </label>

            {keepUpdated ? (
              <ScoutsCard title="Contact details" variant="grey">
                <div className="space-y-3">
                  <Field label="Name" htmlFor="finish-name">
                    <Input
                      id="finish-name"
                      value={contactName}
                      onChange={(event) => setContactName(event.target.value)}
                      maxLength={120}
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Email" htmlFor="finish-email" required>
                    <Input
                      id="finish-email"
                      type="email"
                      inputMode="email"
                      value={contactEmail}
                      onChange={(event) => setContactEmail(event.target.value)}
                      required={keepUpdated}
                      maxLength={254}
                      autoComplete="email"
                    />
                  </Field>
                  <Field label="Your role" htmlFor="finish-role" hint="e.g. Leader, Scout, Parent">
                    <Input
                      id="finish-role"
                      value={contactRole}
                      onChange={(event) => setContactRole(event.target.value)}
                      maxLength={120}
                    />
                  </Field>
                  <Field label="Anything else?" htmlFor="finish-more">
                    <Textarea
                      id="finish-more"
                      value={additionalInfo}
                      onChange={(event) => setAdditionalInfo(event.target.value)}
                      maxLength={2000}
                      rows={3}
                    />
                  </Field>
                </div>
              </ScoutsCard>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={busy || funScore === null || !comments.trim()}
            >
              {busy ? "Checking you in…" : "Check in"}
            </Button>
          </form>
        ) : null}

        {phase.kind === "confirm" ? (
          <>
            <div>
              <h2 className="text-xl font-bold text-scouts-text">🏁 You made it{firstName}!</h2>
              <p className="mt-1 text-scouts-text">You&apos;ve found every stop. Amazing work!</p>
            </div>
            <p className="text-scouts-text">
              Tap the button below to complete the hunt. We&apos;ll then take you to a short
              feedback form. Your feedback is really valuable and helps the Digital Team make the
              next hunt even better.
            </p>
            <Message title="Badge reward" variant="warning">
              🎖 Once you&apos;ve completed the hunt, the Digital Team can hand over your badge.
            </Message>
            <Button
              onClick={() => handleComplete(phase.feedbackUrl)}
              disabled={busy}
              className="w-full"
            >
              {busy ? "Completing your hunt…" : "Complete hunt & give feedback"}
            </Button>
          </>
        ) : null}

        {phase.kind === "redirecting" ? (
          <>
            <div
              aria-hidden="true"
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-scouts-green-light text-3xl text-scouts-green-dark"
            >
              ✓
            </div>
            <h2 className="text-center text-xl font-bold text-scouts-text">
              Hunt complete{firstName}!
            </h2>
            <Message title="Opening feedback" variant="success">
              <p role="status">Taking you to the feedback form…</p>
              <ScoutsLink href={phase.feedbackUrl} className="mt-3 inline-block">
                If nothing happens, tap here to open the feedback form.
              </ScoutsLink>
            </Message>
          </>
        ) : null}

        {phase.kind === "done" ? (
          <>
            <div
              aria-hidden="true"
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-scouts-green-light text-3xl text-scouts-green-dark"
            >
              ✓
            </div>
            <h2 className="text-center text-xl font-bold text-scouts-text">
              {phase.already ? `You're already checked in${firstName}` : `You're checked in${firstName}!`}
            </h2>
            {phase.prizeIssuedAt ? (
              <Message title="Badge issued" variant="success" className="text-center">
                🎖 Badge issued at {timeFormat.format(new Date(phase.prizeIssuedAt))}. Thanks for
                playing!
              </Message>
            ) : (
              <Message title="Collect your badge" variant="warning" className="text-center">
                Show this screen to the Digital Team to collect your badge.
                {phase.reportedAt ? ` Checked in at ${timeFormat.format(new Date(phase.reportedAt))}.` : ""}
              </Message>
            )}
            <Button size="lg" onClick={() => router.push(`/play/${game.id}`)} className="w-full">
              Back to your game →
            </Button>
          </>
        ) : null}
      </div>
    </ScoutsCard>
  );
}
