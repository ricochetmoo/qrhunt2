/**
 * Offline route bundle crypto, shared by server (encrypt) and browser (decrypt).
 *
 * Decision (AGENTS.md open item "whether offline route data includes all hints
 * or only data unlocked so far"): the bundle carries every hint, but each hint
 * after the first is AES-GCM encrypted with a key derived from the *previous*
 * code on the route. Scanning code N therefore unlocks hint N+1 on-device,
 * without the bundle revealing any codes or future hints. Code hashes let the
 * client classify a scan offline (which position it belongs to) without
 * knowing the codes.
 *
 * Uses Web Crypto only, so it runs in Node (Next.js server) and browsers.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type EncryptedHint = { iv: string; data: string }; // base64

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Codes are compared case-insensitively so manual entry is forgiving. */
export function normalizeRouteCode(code: string): string {
  return code.trim().toLowerCase();
}

/** Stable, non-reversible identifier for a code within a game. */
export async function hashRouteCode(gameId: string, code: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`qrhunt:code:${gameId}:${normalizeRouteCode(code)}`),
  );

  return toHex(new Uint8Array(digest));
}

async function deriveHintKey(gameId: string, code: string): Promise<CryptoKey> {
  const material = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`qrhunt:hint:${gameId}:${normalizeRouteCode(code)}`),
  );

  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Encrypt `hint` so that only someone who knows `unlockingCode` can read it. */
export async function encryptHint(
  gameId: string,
  unlockingCode: string,
  hint: string,
): Promise<EncryptedHint> {
  const key = await deriveHintKey(gameId, unlockingCode);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(hint));

  return { iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}

/** Returns the hint, or null if `unlockingCode` is wrong (GCM authentication fails). */
export async function decryptHint(
  gameId: string,
  unlockingCode: string,
  encrypted: EncryptedHint,
): Promise<string | null> {
  try {
    const key = await deriveHintKey(gameId, unlockingCode);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(encrypted.iv) },
      key,
      fromBase64(encrypted.data),
    );

    return decoder.decode(plaintext);
  } catch {
    return null;
  }
}
