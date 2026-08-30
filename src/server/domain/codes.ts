import "server-only";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Largest multiple of 62 that fits in a byte; bytes at or above it are
// rejected so every character is uniformly distributed.
const MAX_UNBIASED = 248;

/** Random base62 route code (default 8 characters) using Web Crypto. */
export function generateRouteCode(length = 8): string {
  let out = "";

  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));

    for (const byte of bytes) {
      if (byte < MAX_UNBIASED) {
        out += BASE62[byte % 62];
        if (out.length === length) break;
      }
    }
  }

  return out;
}

// Uppercase letters and digits with visually confusable characters (0/O, 1/I/L)
// removed, since players type this by hand.
const GAME_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const GAME_CODE_MAX_UNBIASED = 248; // 31 * 8

/** Random, easy-to-type game join code (default 6 characters). */
export function generateGameCode(length = 6): string {
  let out = "";

  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));

    for (const byte of bytes) {
      if (byte < GAME_CODE_MAX_UNBIASED) {
        out += GAME_CODE_ALPHABET[byte % GAME_CODE_ALPHABET.length];
        if (out.length === length) break;
      }
    }
  }

  return out;
}

/** Primary keys are `text` with no DB default, so generate them here. */
export function generateId(): string {
  return crypto.randomUUID();
}
