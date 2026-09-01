import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

import { ACCENT } from "@/server/poster/theme";
import { buildBrandedQrSvg } from "@/server/poster/qr-core";
import { buildQrPayload } from "@/server/poster/url";

import { makeQrImageFilenames, qrImageZipFilename } from "./names";
import { createZip } from "./zip";

export const QR_IMAGE_SIZE = 1200;
const QR_SYMBOL_SIZE = 840;
const QR_SYMBOL_X = (QR_IMAGE_SIZE - QR_SYMBOL_SIZE) / 2;
const QR_SYMBOL_Y = 220;
const LINEAR_LOGO_WIDTH = 246;
const LINEAR_LOGO_HEIGHT = LINEAR_LOGO_WIDTH * (619 / 2195);
const ASSETS_DIR = join(process.cwd(), "public/brand");

export interface QrImageCode {
  name: string;
  code: string;
}

export interface BuildQrImageInput extends QrImageCode {
  gameName: string;
}

const brandAssets = Promise.all([
  readFile(join(ASSETS_DIR, "logo-marque-purple.png")),
  readFile(join(ASSETS_DIR, "logo-linear-white.png")),
]).then(([marque, linear]) => ({
  marque: `data:image/png;base64,${marque.toString("base64")}`,
  linear: `data:image/png;base64,${linear.toString("base64")}`,
}));

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function displayText(value: string, maxCharacters: number): string {
  const trimmed = value.trim();
  if ([...trimmed].length <= maxCharacters) return trimmed;
  return `${[...trimmed].slice(0, maxCharacters - 1).join("")}…`;
}

function buildImageSvg(
  input: BuildQrImageInput,
  assets: { marque: string; linear: string },
): string {
  const payload = buildQrPayload(input.code);
  const qr = buildBrandedQrSvg(payload, {
    size: QR_SYMBOL_SIZE,
    logoDataUri: assets.marque,
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${QR_IMAGE_SIZE}" height="${QR_IMAGE_SIZE}" viewBox="0 0 ${QR_IMAGE_SIZE} ${QR_IMAGE_SIZE}"><rect width="${QR_IMAGE_SIZE}" height="${QR_IMAGE_SIZE}" fill="#FFFFFF"/><rect x="24" y="24" width="1152" height="1152" rx="28" fill="#FFFFFF" stroke="#E4DDF8" stroke-width="4"/><rect x="26" y="26" width="1148" height="122" rx="26" fill="${ACCENT}"/><image href="${escapeXml(assets.linear)}" x="58" y="54" width="${LINEAR_LOGO_WIDTH}" height="${LINEAR_LOGO_HEIGHT}" preserveAspectRatio="xMidYMid meet"/><text x="1140" y="100" text-anchor="end" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="27" font-weight="700">${escapeXml(displayText(input.gameName, 34))}</text><text x="600" y="190" text-anchor="middle" fill="#1A1A1A" font-family="Arial, sans-serif" font-size="36" font-weight="700">${escapeXml(displayText(input.name, 42))}</text><g transform="translate(${QR_SYMBOL_X} ${QR_SYMBOL_Y})">${qr}</g><text x="600" y="1100" text-anchor="middle" fill="#475569" font-family="Arial, sans-serif" font-size="24">Can&apos;t scan? Enter this code:</text><text x="600" y="1150" text-anchor="middle" fill="#1A1A1A" font-family="Arial, sans-serif" font-size="42" font-weight="700" letter-spacing="10">${escapeXml(input.code.toUpperCase())}</text></svg>`;
}

/** Render one square branded QR image as a print-friendly PNG. */
export async function buildQrImagePng(input: BuildQrImageInput): Promise<Buffer> {
  const assets = await brandAssets;
  const svg = buildImageSvg(input, assets);

  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

export interface BuildQrImagesZipInput {
  gameName: string;
  codes: QrImageCode[];
}

/** Render all route codes in order and package them into one ZIP download. */
export async function buildQrImagesZip(
  input: BuildQrImagesZipInput,
): Promise<Buffer> {
  if (input.codes.length === 0) {
    throw new Error("buildQrImagesZip: at least one QR code is required");
  }

  const filenames = makeQrImageFilenames(input.codes);
  const entries = [];

  for (const [index, code] of input.codes.entries()) {
    entries.push({
      name: filenames[index],
      data: await buildQrImagePng({ ...code, gameName: input.gameName }),
    });
  }

  return createZip(entries);
}

export { qrImageZipFilename };
