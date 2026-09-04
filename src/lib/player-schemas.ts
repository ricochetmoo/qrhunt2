import { z } from "zod";

import { latitude, longitude, optionalText } from "./zod-helpers";

/**
 * Zod request schemas for `/api/player/*`. Browser-safe: the player UI can
 * reuse them for client-side validation.
 */

/** Game and team join codes are uppercase; accept any case from players. */
const joinCode = z
  .string()
  .trim()
  .min(1)
  .max(16)
  .transform((value) => value.toUpperCase());

/** A route QR payload: either the bare 8-character code or a poster URL containing it. */
const qrPayload = z.string().trim().min(1).max(2048);

export const joinGameSchema = z
  .object({
    gameCode: joinCode.optional(),
    qrCode: qrPayload.optional(),
    teamCode: joinCode.optional(),
  })
  .refine(
    (value) => [value.gameCode, value.qrCode, value.teamCode].filter(Boolean).length === 1,
    { message: "Provide exactly one of gameCode, qrCode, or teamCode." },
  );

const teamName = z.string().trim().min(1, "Team name is required.").max(60);

export const teamActionSchema = z.discriminatedUnion("action", [
  // Creating a team is what enrols a player, so it must re-present a code as
  // proof of capability (there is no pre-team membership record): either the
  // typed game code or a poster QR payload from this game — poster joiners
  // never learn the game code.
  z
    .object({
      action: z.literal("create"),
      gameCode: joinCode.optional(),
      qrCode: qrPayload.optional(),
      name: teamName.optional(),
    })
    .refine((value) => [value.gameCode, value.qrCode].filter(Boolean).length === 1, {
      message: "Provide the game code or a poster QR payload.",
    }),
  z.object({ action: z.literal("join"), teamCode: joinCode }),
]);

/** Photos are an https URL or a small inline image (≤ ~512 KB) until blob storage exists. */
const MAX_PHOTO_DATA_URL_LENGTH = 700_000;

export const teamPhotoSchema = z
  .string()
  .trim()
  .max(MAX_PHOTO_DATA_URL_LENGTH, "Photo is too large (max ~512 KB).")
  .refine(
    (value) =>
      /^https:\/\/\S{1,2000}$/.test(value) ||
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value),
    "Photo must be an https URL or a JPEG/PNG/WebP data URL.",
  );

export const updateTeamSchema = z
  .object({
    name: teamName.optional(),
    photoUrl: teamPhotoSchema.nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.photoUrl !== undefined, {
    message: "Provide a name or a photo to update.",
  });

export const scanSubmissionSchema = z.object({
  /** Client-generated id (e.g. a UUID) so offline replays are idempotent. */
  clientScanId: z.string().trim().min(1).max(64),
  /** The scanned QR payload or a manually entered human-readable code. */
  code: qrPayload,
  /** When the device recorded the scan (ISO-8601). Untrusted; used for ordering only. */
  scannedAt: z.iso.datetime({ offset: true }),
  latitude: latitude(),
  longitude: longitude(),
});

export const syncScansSchema = z.object({
  /** The `route.version` the client holds; the server reapplies its own rules regardless. */
  routeVersion: z.string().max(64).optional(),
  scans: z.array(scanSubmissionSchema).min(1).max(100),
});

export const FUN_SCORE_MIN = 1;
export const FUN_SCORE_MAX = 10;

const emailOrEmpty = z
  .string()
  .trim()
  .max(254)
  .nullable()
  .optional()
  .transform((value) => (value === "" ? null : (value ?? null)))
  .refine(
    (value) => value === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "Enter a valid email address.",
  );

/**
 * Checking in at the finish line (`POST /games/:gameId/complete`). The
 * finish-line code is the capability proof. The fun score and comments are
 * the gate when feedback is collected in-app; a game with a feedback URL
 * collects it on that external form instead, so both are optional here and
 * the server decides (domain/completion.ts). The keep-updated details are
 * optional but need an email to be useful.
 */
export const reportCompletionSchema = z
  .object({
    /** The finish-line QR payload the player scanned. */
    code: qrPayload,
    funScore: z.number().int().min(FUN_SCORE_MIN).max(FUN_SCORE_MAX).optional(),
    comments: z
      .string()
      .trim()
      .min(1, "Share a thought or two before checking in.")
      .max(2000)
      .optional(),
    keepUpdated: z.boolean().default(false),
    contactName: optionalText(120),
    contactEmail: emailOrEmpty,
    contactRole: optionalText(120),
    additionalInfo: optionalText(2000),
  })
  .refine((value) => !value.keepUpdated || Boolean(value.contactEmail), {
    message: "Add an email address so we can keep you updated.",
    path: ["contactEmail"],
  });

/** First name only — shown to teammates and admins; no surnames for child privacy. */
export const updatePlayerMeSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(50),
});

export const playerGameIdParamSchema = z.object({ gameId: z.string().min(1) });
export const playerTeamIdParamSchema = z.object({ teamId: z.string().min(1) });

export type JoinGameInput = z.infer<typeof joinGameSchema>;
export type TeamActionInput = z.infer<typeof teamActionSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type ScanSubmission = z.infer<typeof scanSubmissionSchema>;
export type ReportCompletionInput = z.infer<typeof reportCompletionSchema>;
export type SyncScansInput = z.infer<typeof syncScansSchema>;
