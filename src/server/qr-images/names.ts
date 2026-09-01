import "server-only";

export interface QrImageNameInput {
  name: string;
  code: string;
}

/** Turn user-entered labels into stable, filesystem-safe filename segments. */
export function slugifyFilePart(value: string, fallback: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/, "");

  return slug || fallback;
}

/**
 * Generate collision-safe names in route order. The route code normally makes
 * every name unique, while the suffix keeps this safe for malformed fixtures
 * or future code imports that contain duplicate values.
 */
export function makeQrImageFilenames(codes: QrImageNameInput[]): string[] {
  const orderWidth = Math.max(3, String(codes.length).length);
  const used = new Map<string, number>();

  return codes.map((code, index) => {
    const base = `${String(index + 1).padStart(orderWidth, "0")}-${slugifyFilePart(code.name, "code")}-${slugifyFilePart(code.code, "value")}`;
    const previousCount = used.get(base) ?? 0;
    used.set(base, previousCount + 1);

    return `${base}${previousCount === 0 ? "" : `-${previousCount + 1}`}.png`;
  });
}

export function qrImageZipFilename(gameName: string): string {
  return `${slugifyFilePart(gameName, "game")}-qr-images.zip`;
}
