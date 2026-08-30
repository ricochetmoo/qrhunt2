import { z } from "zod";

import { gameModeSchema } from "./game-mode";
import { gameStatusSchema } from "./game-status";
import { latitude, longitude, optionalText } from "./zod-helpers";

/**
 * Zod request schemas shared by the Hono admin routes and the admin UI forms.
 * Browser-safe: no server imports.
 */

const gameName = z.string().trim().min(1, "Name is required.").max(120);

export const createGameSchema = z.object({
  name: gameName,
});

/** Per-game configuration (see AGENTS.md "Admin configuration frontend"). */
export const gameConfigSchema = z.object({
  gameMode: gameModeSchema,
  allowSelfSignup: z.boolean(),
  allowTeamCreation: z.boolean(),
  allowTeamNames: z.boolean(),
  allowTeamPhotos: z.boolean(),
  routeSignupEnabled: z.boolean(),
  wildcardEnabled: z.boolean(),
  wildcardName: optionalText(60),
  staggeredStart: z.boolean(),
  // ISO-8601 datetime string or null; the API stores a timestamp.
  qrRemoveBy: z.iso.datetime({ offset: true }).nullable().optional(),
  issueContactPhone: optionalText(30),
});

export const updateGameSchema = z
  .object({
    name: gameName.optional(),
    status: gameStatusSchema.optional(),
    pauseReason: z.string().trim().max(500).nullable().optional(),
  })
  .extend(gameConfigSchema.partial().shape)
  .refine((value) => !(value.wildcardEnabled && value.wildcardName === null), {
    message: "Give the wildcard a name when it is enabled.",
    path: ["wildcardName"],
  });

export const qrCodeInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  hint: z.string().trim().min(1, "Hint is required.").max(1000),
  latitude: latitude(),
  longitude: longitude(),
  isWildcard: z.boolean().optional(),
});

export const updateQrCodeSchema = qrCodeInputSchema.partial();

export const reorderQrCodesSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export const gameIdParamSchema = z.object({
  gameId: z.string().min(1),
});

export const qrCodeParamSchema = gameIdParamSchema.extend({
  qrCodeId: z.string().min(1),
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type UpdateGameInput = z.infer<typeof updateGameSchema>;
export type GameConfigInput = z.infer<typeof gameConfigSchema>;
export type QrCodeInput = z.infer<typeof qrCodeInputSchema>;
export type UpdateQrCodeInput = z.infer<typeof updateQrCodeSchema>;
