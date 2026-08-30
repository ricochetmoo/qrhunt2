import { z } from "zod";

import { gameStatusSchema } from "./game-status";

/**
 * Zod request schemas shared by the Hono admin routes and the admin UI forms.
 * Browser-safe: no server imports.
 */

const gameName = z.string().trim().min(1, "Name is required.").max(120);

export const createGameSchema = z.object({
  name: gameName,
});

export const updateGameSchema = z.object({
  name: gameName.optional(),
  status: gameStatusSchema.optional(),
  pauseReason: z.string().trim().max(500).nullable().optional(),
});

const decimalString = z.string().trim().regex(/^-?\d+(\.\d+)?$/, "Must be a decimal number.");

const coordinate = (min: number, max: number, label: string) =>
  decimalString
    .refine((value) => {
      const n = Number(value);
      return n >= min && n <= max;
    }, `${label} must be between ${min} and ${max}.`)
    .nullable()
    .optional()
    // Treat empty form input as "not set".
    .or(z.literal("").transform(() => null));

export const qrCodeInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  hint: z.string().trim().min(1, "Hint is required.").max(1000),
  latitude: coordinate(-90, 90, "Latitude"),
  longitude: coordinate(-180, 180, "Longitude"),
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
export type QrCodeInput = z.infer<typeof qrCodeInputSchema>;
export type UpdateQrCodeInput = z.infer<typeof updateQrCodeSchema>;
