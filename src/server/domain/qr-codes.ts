import "server-only";

import { and, asc, eq, max } from "drizzle-orm";

import { db } from "@/db";
import { qr_codes } from "@/db/schema";
import type { QrCode } from "@/db/types";
import type { QrCodeInput, UpdateQrCodeInput } from "@/lib/admin-schemas";

import { generateId, generateRouteCode } from "./codes";
import { DomainError, isUniqueViolation } from "./errors";
import { getGame } from "./games";

const CODE_INSERT_ATTEMPTS = 3;

export async function listQrCodes(gameId: string): Promise<QrCode[]> {
  return db
    .select()
    .from(qr_codes)
    .where(eq(qr_codes.gameId, gameId))
    .orderBy(asc(qr_codes.sortOrder), asc(qr_codes.createdAt));
}

async function requireGame(gameId: string) {
  const game = await getGame(gameId);

  if (!game) {
    throw new DomainError("NOT_FOUND", "Game not found.");
  }

  return game;
}

export async function createQrCode(gameId: string, input: QrCodeInput): Promise<QrCode> {
  await requireGame(gameId);

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(qr_codes.sortOrder) })
    .from(qr_codes)
    .where(eq(qr_codes.gameId, gameId));

  const sortOrder = (maxOrder ?? -1) + 1;

  for (let attempt = 1; ; attempt++) {
    try {
      const [created] = await db
        .insert(qr_codes)
        .values({
          id: generateId(),
          gameId,
          name: input.name,
          hint: input.hint,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          code: generateRouteCode(),
          sortOrder,
        })
        .returning();

      return created;
    } catch (error) {
      // Codes are random and globally unique; a collision is astronomically
      // unlikely, but regenerate rather than surface it.
      if (!isUniqueViolation(error) || attempt >= CODE_INSERT_ATTEMPTS) {
        throw error;
      }
    }
  }
}

export async function updateQrCode(
  gameId: string,
  qrCodeId: string,
  patch: UpdateQrCodeInput,
): Promise<QrCode> {
  const [updated] = await db
    .update(qr_codes)
    .set({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.hint !== undefined && { hint: patch.hint }),
      ...(patch.latitude !== undefined && { latitude: patch.latitude }),
      ...(patch.longitude !== undefined && { longitude: patch.longitude }),
      updatedAt: new Date(),
    })
    .where(and(eq(qr_codes.id, qrCodeId), eq(qr_codes.gameId, gameId)))
    .returning();

  if (!updated) {
    throw new DomainError("NOT_FOUND", "QR code not found.");
  }

  return updated;
}

/** Renumber a game's codes 0..n-1 preserving their current order. */
async function normalizeOrder(gameId: string): Promise<QrCode[]> {
  const codes = await listQrCodes(gameId);

  for (const [index, code] of codes.entries()) {
    if (code.sortOrder !== index) {
      await db.update(qr_codes).set({ sortOrder: index }).where(eq(qr_codes.id, code.id));
      code.sortOrder = index;
    }
  }

  return codes;
}

export async function deleteQrCode(gameId: string, qrCodeId: string): Promise<QrCode[]> {
  const deleted = await db
    .delete(qr_codes)
    .where(and(eq(qr_codes.id, qrCodeId), eq(qr_codes.gameId, gameId)))
    .returning({ id: qr_codes.id });

  if (deleted.length === 0) {
    throw new DomainError("NOT_FOUND", "QR code not found.");
  }

  return normalizeOrder(gameId);
}

/**
 * Apply a complete new ordering. `orderedIds` must contain exactly the game's
 * codes. The Neon HTTP driver has no interactive transactions, so updates run
 * sequentially; routes are small so this is acceptable for admin use.
 */
export async function reorderQrCodes(gameId: string, orderedIds: string[]): Promise<QrCode[]> {
  await requireGame(gameId);

  const existing = await listQrCodes(gameId);
  const existingIds = new Set(existing.map((code) => code.id));
  const requestedIds = new Set(orderedIds);

  if (
    orderedIds.length !== existing.length ||
    requestedIds.size !== orderedIds.length ||
    [...requestedIds].some((id) => !existingIds.has(id))
  ) {
    throw new DomainError(
      "ROUTE_MISMATCH",
      "The ordered list must contain every QR code in this game exactly once.",
    );
  }

  const currentOrder = new Map(existing.map((code) => [code.id, code.sortOrder]));

  for (const [index, id] of orderedIds.entries()) {
    if (currentOrder.get(id) !== index) {
      await db.update(qr_codes).set({ sortOrder: index }).where(eq(qr_codes.id, id));
    }
  }

  return listQrCodes(gameId);
}
