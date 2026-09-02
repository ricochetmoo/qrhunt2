import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { create, type QRCodeErrorCorrectionLevel } from "qrcode";

import { ACCENT, QR_SIZE } from "./theme";

const DEFAULT_LOGO_PATH = join(
  process.cwd(),
  "public/brand/logo-marque-purple.png",
);
const QUIET_ZONE = 4;
const DEFAULT_LOGO_SCALE = 0.18;
const LOGO_PADDING = 0.5;
const LOGO_ASPECT_RATIO = 2067 / 1884;

export type QRLogoSource = string | Buffer;

export interface QRCodeRenderOptions {
  /** Rendered size in PDF points or SVG pixels. */
  size?: number;
  /** qrcode's error-correction level. H is the branded default. */
  errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
  /** Set to null to render a deliberately unbranded QR code. */
  logo?: QRLogoSource | null;
  /** Logo width as a fraction of the QR symbol width, excluding quiet space. */
  logoScale?: number;
}

export interface BrandedQrSvgOptions {
  size?: number;
  errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
  /** A data URI for the marque. Omit to use the bundled purple marque. */
  logoDataUri?: string | null;
  logoScale?: number;
}

export interface QrModel {
  size: number;
  moduleCount: number;
  data: Uint8Array;
  extent: number;
  logo: QRLogoSource | null;
  logoWidth: number;
  logoHeight: number;
  logoX: number;
  logoY: number;
  isKnockedOut: (row: number, col: number) => boolean;
}

function validateRenderOptions(options: QRCodeRenderOptions): void {
  if (
    options.size !== undefined &&
    (!Number.isFinite(options.size) || options.size <= 0)
  ) {
    throw new Error("QR code size must be a positive finite number");
  }

  if (
    options.logoScale !== undefined &&
    (!Number.isFinite(options.logoScale) ||
      options.logoScale <= 0 ||
      options.logoScale >= 1)
  ) {
    throw new Error("QR code logoScale must be greater than 0 and less than 1");
  }
}

export function createQrModel(value: string, options: QRCodeRenderOptions = {}): QrModel {
  validateRenderOptions(options);

  const size = options.size ?? QR_SIZE;
  const logo = options.logo === null ? null : options.logo ?? DEFAULT_LOGO_PATH;
  const logoScale = options.logoScale ?? DEFAULT_LOGO_SCALE;
  const { modules } = create(value, {
    errorCorrectionLevel: options.errorCorrectionLevel ?? "H",
  });
  const { size: moduleCount, data } = modules;
  const extent = moduleCount + QUIET_ZONE * 2;

  const logoWidth = moduleCount * logoScale;
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;
  const logoX = (extent - logoWidth) / 2;
  const logoY = (extent - logoHeight) / 2;
  // A fractional SVG knockout edge can cut through a QR module when the PDF
  // is rasterised. Expand each edge to the next module boundary so the
  // marque's whitespace always removes complete modules.
  const knockoutX = Math.floor(logoX - LOGO_PADDING);
  const knockoutY = Math.floor(logoY - LOGO_PADDING);
  const knockoutRight = Math.ceil(logoX + logoWidth + LOGO_PADDING);
  const knockoutBottom = Math.ceil(logoY + logoHeight + LOGO_PADDING);
  const hasLogo = logo !== null;

  return {
    size,
    moduleCount,
    data,
    extent,
    logo,
    logoWidth,
    logoHeight,
    logoX,
    logoY,
    isKnockedOut: (row, col) =>
      hasLogo &&
      col + QUIET_ZONE >= knockoutX &&
      col + QUIET_ZONE < knockoutRight &&
      row + QUIET_ZONE >= knockoutY &&
      row + QUIET_ZONE < knockoutBottom,
  };
}

export function buildQrPath(model: QrModel): string {
  let path = "";

  for (let row = 0; row < model.moduleCount; row++) {
    for (let col = 0; col < model.moduleCount; col++) {
      if (
        model.data[row * model.moduleCount + col] &&
        !model.isKnockedOut(row, col)
      ) {
        path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
  }

  return path;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function defaultLogoDataUri(): string {
  return `data:image/png;base64,${readFileSync(DEFAULT_LOGO_PATH).toString("base64")}`;
}

/** Render the shared branded QR symbol as SVG for PDF or raster output. */
export function buildBrandedQrSvg(
  value: string,
  options: BrandedQrSvgOptions = {},
): string {
  const model = createQrModel(value, {
    size: options.size,
    errorCorrectionLevel: options.errorCorrectionLevel,
    logo: options.logoDataUri === null ? null : options.logoDataUri,
    logoScale: options.logoScale,
  });
  const logoDataUri =
    model.logo === null ? null : options.logoDataUri ?? defaultLogoDataUri();
  const logo = logoDataUri
    ? `<image href="${escapeXml(logoDataUri)}" x="${model.logoX}" y="${model.logoY}" width="${model.logoWidth}" height="${model.logoHeight}" preserveAspectRatio="none"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${model.size}" height="${model.size}" viewBox="0 0 ${model.extent} ${model.extent}" shape-rendering="crispEdges"><rect width="${model.extent}" height="${model.extent}" fill="#FFFFFF"/><path d="${buildQrPath(model)}" fill="${ACCENT}"/>${logo}</svg>`;
}
