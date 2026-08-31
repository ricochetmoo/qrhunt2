import "server-only";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// Largest multiple of 62 that fits in a byte; bytes at or above it are
// rejected so every character is uniformly distributed.
const MAX_UNBIASED = 248;

/** Random, easy-to-type code of `length` uppercase characters using Web Crypto. */
function generateCode(length: number): string {
  let out = "";

  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));

    for (const byte of bytes) {
      if (byte < MAX_UNBIASED) {
        out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
        if (out.length === length) break;
      }
    }
  }

  return out;
}

/** Random route code (default 8 uppercase characters). */
export function generateRouteCode(length = 8): string {
  return generateCode(length);
}

/** Random game join code (default 6 uppercase characters). */
export function generateGameCode(length = 6): string {
  return generateCode(length);
}

/** Team join codes share the game-code alphabet; both are typed by players. */
export function generateTeamCode(length = 6): string {
  return generateCode(length);
}

/** Primary keys are `text` with no DB default, so generate them here. */
export function generateId(): string {
  return crypto.randomUUID();
}
