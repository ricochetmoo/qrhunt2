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

/** Primary keys are `text` with no DB default, so generate them here. */
export function generateId(): string {
  return crypto.randomUUID();
}
