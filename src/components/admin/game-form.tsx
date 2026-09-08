"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Accordion } from "@/components/ui/accordion";
import { Tag } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { CheckboxGroup, RadioGroup } from "@/components/ui/choice-group";
import { Details, InsetText } from "@/components/ui/details";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Message } from "@/components/ui/message";
import type { Game } from "@/db/types";
import { apiClient } from "@/lib/api-client";
import { readError } from "@/lib/api-errors";
import { COMPLETION_MESSAGE_MAX_LENGTH } from "@/lib/completion";
import {
  GAME_MODES,
  GAME_MODE_DESCRIPTIONS,
  GAME_MODE_LABELS,
  isGameMode,
  type GameMode,
} from "@/lib/game-mode";
import { GAME_STATUSES, GAME_STATUS_LABELS, isGameStatus, type GameStatus } from "@/lib/game-status";
import { HELP_TEXT_MAX_LENGTH } from "@/lib/help";

export type EditableGame = Pick<
  Game,
  | "id"
  | "name"
  | "status"
  | "pauseReason"
  | "helpText"
  | "completionMessage"
  | "feedbackUrl"
  | "gameCode"
  | "gameMode"
  | "allowOutOfOrder"
  | "allowSelfSignup"
  | "allowTeamCreation"
  | "allowTeamNames"
  | "allowTeamPhotos"
  | "routeSignupEnabled"
  | "wildcardEnabled"
  | "wildcardName"
  | "staggeredStart"
  | "issueContactPhone"
> & { qrRemoveBy: string | null };

type GameFormProps = { mode: "create" } | { mode: "edit"; game: EditableGame };

type ConfigState = {
  gameMode: GameMode;
  helpText: string;
  completionMessage: string;
  feedbackUrl: string;
  allowOutOfOrder: boolean;
  allowSelfSignup: boolean;
  allowTeamCreation: boolean;
  allowTeamNames: boolean;
  allowTeamPhotos: boolean;
  routeSignupEnabled: boolean;
  wildcardEnabled: boolean;
  wildcardName: string;
  staggeredStart: boolean;
  qrRemoveBy: string; // value of a datetime-local input, in the admin's local time
  issueContactPhone: string;
};

/** datetime-local wants `YYYY-MM-DDTHH:mm` in local time. */
function toLocalInputValue(dateValue: string | null): string {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initialConfig(game: EditableGame | null): ConfigState {
  return {
    gameMode: game && isGameMode(game.gameMode) ? game.gameMode : "speed",
    helpText: game?.helpText ?? "",
    completionMessage: game?.completionMessage ?? "",
    feedbackUrl: game?.feedbackUrl ?? "",
    allowOutOfOrder: game?.allowOutOfOrder ?? false,
    allowSelfSignup: game?.allowSelfSignup ?? true,
    allowTeamCreation: game?.allowTeamCreation ?? true,
    allowTeamNames: game?.allowTeamNames ?? true,
    allowTeamPhotos: game?.allowTeamPhotos ?? false,
    routeSignupEnabled: game?.routeSignupEnabled ?? false,
    wildcardEnabled: game?.wildcardEnabled ?? false,
    wildcardName: game?.wildcardName ?? "",
    staggeredStart: game?.staggeredStart ?? false,
    qrRemoveBy: toLocalInputValue(game?.qrRemoveBy ?? null),
    issueContactPhone: game?.issueContactPhone ?? "",
  };
}

export function GameForm(props: GameFormProps) {
  const router = useRouter();
  const game = props.mode === "edit" ? props.game : null;

  const [name, setName] = useState(game?.name ?? "");
  const [status, setStatus] = useState<GameStatus>(
    game && isGameStatus(game.status) ? game.status : "draft",
  );
  const [pauseReason, setPauseReason] = useState(game?.pauseReason ?? "");
  const [config, setConfig] = useState<ConfigState>(() => initialConfig(game));
  const [gameCode, setGameCode] = useState(game?.gameCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ConfigState>(key: K) => (value: ConfigState[K]) =>
    setConfig((current) => ({ ...current, [key]: value }));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      if (props.mode === "create") {
        const response = await apiClient.api.admin.games.$post({ json: { name } });

        if (!response.ok) {
          setError(await readError(response));
          return;
        }

        const { game: created } = await response.json();
        router.push(`/admin/games/${created.id}/edit`);
        return;
      }

      const response = await apiClient.api.admin.games[":gameId"].$patch({
        param: { gameId: props.game.id },
        json: {
          name,
          status,
          pauseReason: status === "paused" ? pauseReason : null,
          helpText: config.helpText.trim() || null,
          completionMessage: config.completionMessage.trim() || null,
          feedbackUrl: config.feedbackUrl.trim() || null,
          gameMode: config.gameMode,
          allowOutOfOrder: config.allowOutOfOrder,
          allowSelfSignup: config.allowSelfSignup,
          allowTeamCreation: config.allowTeamCreation,
          allowTeamNames: config.allowTeamNames,
          allowTeamPhotos: config.allowTeamPhotos,
          routeSignupEnabled: config.routeSignupEnabled,
          wildcardEnabled: config.wildcardEnabled,
          wildcardName: config.wildcardName.trim() || null,
          staggeredStart: config.staggeredStart,
          qrRemoveBy: config.qrRemoveBy ? new Date(config.qrRemoveBy).toISOString() : null,
          issueContactPhone: config.issueContactPhone.trim() || null,
        },
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      setSaved(true);
      router.refresh();
    });
  }

  function handleRegenerateCode() {
    if (props.mode !== "edit") return;
    if (!window.confirm("Issue a new game code? The current code will stop working immediately.")) return;

    setError(null);
    startTransition(async () => {
      const response = await apiClient.api.admin.games[":gameId"]["game-code"].$post({
        param: { gameId: props.game.id },
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      const { game: updated } = await response.json();
      setGameCode(updated.gameCode);
      router.refresh();
    });
  }

  function handleDelete() {
    if (props.mode !== "edit") return;
    if (!window.confirm(`Delete "${props.game.name}" and all of its QR codes and teams?`)) return;

    setError(null);
    startTransition(async () => {
      const response = await apiClient.api.admin.games[":gameId"].$delete({
        param: { gameId: props.game.id },
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      router.push("/admin/games");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <Message title="There is a problem with these settings" variant="danger">
          {error}
        </Message>
      ) : null}

      <Field label="Name" htmlFor="game-name" hint="Use a name that leaders and players will recognise." required>
        <Input
          id="game-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={120}
          autoFocus={props.mode === "create"}
        />
      </Field>

      {props.mode === "edit" ? (
        <>
          <Field
            label="Game code"
            htmlFor="game-code"
            hint="Players enter this code to join. Share it at the start of the game."
          >
            <Box variant="grey" size="sm" className="flex flex-wrap items-center justify-between gap-3">
              <code id="game-code" className="font-mono text-xl font-bold tracking-widest text-scouts-text">
                {gameCode}
              </code>
              <Button variant="secondary" size="sm" onClick={handleRegenerateCode} disabled={pending}>
                Issue new code
              </Button>
            </Box>
          </Field>

          <InsetText className="my-0">
            Issuing a new game code stops the current code working immediately. Update any printed or shared joining instructions afterwards.
          </InsetText>

          <Field
            label="Status"
            htmlFor="game-status"
            hint="The lifecycle status controls what players can see, join, and do."
          >
            <div className="flex flex-wrap items-center gap-3">
              <Select
                id="game-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as GameStatus)}
                className="max-w-xs"
              >
                {GAME_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {GAME_STATUS_LABELS[value]}
                  </option>
                ))}
              </Select>
            </div>
          </Field>

          <Details summary="What do the lifecycle statuses mean?" className="my-0">
            <ul className="list-inside list-disc space-y-1 text-sm text-scouts-muted">
              <li><Tag variant="grey">Draft</Tag> is still being prepared.</li>
              <li><Tag variant="info">Published</Tag> can be joined, but does not release the first hint.</li>
              <li><Tag variant="success">Started</Tag> is live and accepts scans.</li>
              <li><Tag variant="warning">Paused</Tag> is visible, but scanning is temporarily stopped.</li>
              <li><Tag variant="purple">Finished</Tag> stays viewable without accepting new progress.</li>
              <li><Tag variant="grey">Archived</Tag> is hidden from players and retained for administrators.</li>
            </ul>
          </Details>

          {status === "paused" ? (
            <Field
              label="Pause message"
              htmlFor="game-pause-reason"
              hint="Shown to players while the game is paused, e.g. “Come back to the start”."
            >
              <Textarea
                id="game-pause-reason"
                value={pauseReason}
                onChange={(event) => setPauseReason(event.target.value)}
                maxLength={500}
              />
            </Field>
          ) : null}

          <Accordion
            multiple
            items={[
              {
                id: "game-mode",
                title: "Game mode",
                content: (
                  <div className="space-y-6">
                    <RadioGroup
                      name="cfg-game-mode"
                      legend="How should teams be ranked?"
                      value={config.gameMode}
                      onChange={(value) => {
                        if (isGameMode(value)) set("gameMode")(value);
                      }}
                      options={GAME_MODES.map((mode) => ({
                        value: mode,
                        label: GAME_MODE_LABELS[mode],
                        hint: GAME_MODE_DESCRIPTIONS[mode],
                      }))}
                    />
                    <CheckboxGroup
                      name="cfg-route-order"
                      legend="Route order"
                      value={config.allowOutOfOrder ? ["out-of-order"] : []}
                      onChange={(values) => set("allowOutOfOrder")(values.includes("out-of-order"))}
                      options={[
                        {
                          value: "out-of-order",
                          label: "Stops can be found in any order",
                          hint: "When off, players must follow the route in sequence. Any order pairs well with Completeness mode.",
                        },
                      ]}
                    />
                  </div>
                ),
              },
              {
                id: "player-help",
                title: "Player help",
                content: (
                  <Field
                    label="Help text"
                    htmlFor="cfg-help-text"
                    hint={`Optional game-specific guidance for players. Up to ${HELP_TEXT_MAX_LENGTH} characters.`}
                  >
                    <Textarea
                      id="cfg-help-text"
                      value={config.helpText}
                      onChange={(event) => set("helpText")(event.target.value)}
                      maxLength={HELP_TEXT_MAX_LENGTH}
                      rows={5}
                    />
                  </Field>
                ),
              },
              {
                id: "players-teams",
                title: "Players and teams",
                content: (
                  <CheckboxGroup
                    name="cfg-player-team-settings"
                    legend="Player and team options"
                    value={[
                      ...(config.allowSelfSignup ? ["self-signup"] : []),
                      ...(config.allowTeamCreation ? ["team-creation"] : []),
                      ...(config.allowTeamNames ? ["team-names"] : []),
                      ...(config.allowTeamPhotos ? ["team-photos"] : []),
                      ...(config.routeSignupEnabled ? ["route-signup"] : []),
                    ]}
                    onChange={(values) =>
                      setConfig((current) => ({
                        ...current,
                        allowSelfSignup: values.includes("self-signup"),
                        allowTeamCreation: values.includes("team-creation"),
                        allowTeamNames: values.includes("team-names"),
                        allowTeamPhotos: values.includes("team-photos"),
                        routeSignupEnabled: values.includes("route-signup"),
                      }))
                    }
                    options={[
                      {
                        value: "self-signup",
                        label: "Players can sign up themselves",
                        hint: "When off, only administrators can add players to teams.",
                      },
                      {
                        value: "team-creation",
                        label: "Players can create teams",
                        hint: "When off, players can only join teams that already exist.",
                        disabled: !config.allowSelfSignup,
                      },
                      { value: "team-names", label: "Players can choose a team name" },
                      { value: "team-photos", label: "Players can upload a team photo" },
                      {
                        value: "route-signup",
                        label: "Join by scanning a route QR code",
                        hint: "Lets players join directly from any poster instead of entering the game code.",
                      },
                    ]}
                  />
                ),
              },
              {
                id: "wildcard",
                title: "Wildcard",
                content: (
                  <div className="space-y-5">
                    <CheckboxGroup
                      name="cfg-wildcard-settings"
                      legend="Wildcard option"
                      value={config.wildcardEnabled ? ["wildcard"] : []}
                      onChange={(values) => set("wildcardEnabled")(values.includes("wildcard"))}
                      options={[
                        {
                          value: "wildcard",
                          label: "Wildcard is active",
                          hint: "An extra object players can scan at any point, outside the route order.",
                        },
                      ]}
                    />
                    {config.wildcardEnabled ? (
                      <Field label="Wildcard name" htmlFor="cfg-wildcard-name" hint="How it appears to players." required>
                        <Input
                          id="cfg-wildcard-name"
                          value={config.wildcardName}
                          onChange={(event) => set("wildcardName")(event.target.value)}
                          maxLength={60}
                          required
                        />
                      </Field>
                    ) : null}
                  </div>
                ),
              },
              {
                id: "start-posters",
                title: "Start and posters",
                content: (
                  <div className="space-y-5">
                    <CheckboxGroup
                      name="cfg-start-settings"
                      legend="Start settings"
                      value={config.staggeredStart ? ["staggered"] : []}
                      onChange={(values) => set("staggeredStart")(values.includes("staggered"))}
                      options={[
                        {
                          value: "staggered",
                          label: "Staggered start",
                          hint: "Teams set off at intervals rather than all at once.",
                        },
                      ]}
                    />
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field
                        label="Remove QR codes by"
                        htmlFor="cfg-remove-by"
                        hint="Printed on posters so the public knows when they will be taken down."
                      >
                        <Input
                          id="cfg-remove-by"
                          type="datetime-local"
                          value={config.qrRemoveBy}
                          onChange={(event) => set("qrRemoveBy")(event.target.value)}
                        />
                      </Field>
                      <Field
                        label="Issue contact phone"
                        htmlFor="cfg-phone"
                        hint="Public number printed on posters for reporting problems."
                      >
                        <Input
                          id="cfg-phone"
                          type="tel"
                          value={config.issueContactPhone}
                          onChange={(event) => set("issueContactPhone")(event.target.value)}
                          maxLength={30}
                        />
                      </Field>
                    </div>
                  </div>
                ),
              },
              {
                id: "completion",
                title: "Completion",
                content: (
                  <div className="space-y-5">
                    <Field
                      label="Feedback URL"
                      htmlFor="cfg-feedback-url"
                      hint="Optional. When set, the finish-line code records completion and then sends players here for feedback."
                    >
                      <Input
                        id="cfg-feedback-url"
                        type="url"
                        value={config.feedbackUrl}
                        onChange={(event) => set("feedbackUrl")(event.target.value)}
                        maxLength={2048}
                        placeholder="https://example.com/feedback"
                      />
                    </Field>
                    <Field
                      label="Completion message"
                      htmlFor="cfg-completion-message"
                      hint={`Shown to a team when it completes the route. Leave blank for the standard congratulations message. Up to ${COMPLETION_MESSAGE_MAX_LENGTH} characters.`}
                    >
                      <Textarea
                        id="cfg-completion-message"
                        value={config.completionMessage}
                        onChange={(event) => set("completionMessage")(event.target.value)}
                        maxLength={COMPLETION_MESSAGE_MAX_LENGTH}
                        rows={5}
                      />
                    </Field>
                  </div>
                ),
              },
            ]}
          />
        </>
      ) : null}

      <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : props.mode === "create" ? "Create game" : "Save changes"}
        </Button>
        {props.mode === "edit" ? (
          <Button variant="danger" onClick={handleDelete} disabled={pending}>
            Delete game
          </Button>
        ) : null}
      </div>
      {saved ? (
        <Message title="Changes saved" variant="success">
          The game settings have been updated.
        </Message>
      ) : null}
    </form>
  );
}
