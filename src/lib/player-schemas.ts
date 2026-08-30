import { z } from "zod";

import { latitude, longitude } from "./zod-helpers";

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
  z.object({ action: z.literal("create"), name: teamName.optional() }),
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

export const playerGameIdParamSchema = z.object({ gameId: z.string().min(1) });
export const playerTeamIdParamSchema = z.object({ teamId: z.string().min(1) });

export type JoinGameInput = z.infer<typeof joinGameSchema>;
export type TeamActionInput = z.infer<typeof teamActionSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type ScanSubmission = z.infer<typeof scanSubmissionSchema>;
export type SyncScansInput = z.infer<typeof syncScansSchema>;
