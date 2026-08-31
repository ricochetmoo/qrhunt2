import "server-only";

import { join } from "node:path";
import { createElement, type ReactElement } from "react";

import { Image, Path, Rect, Svg, View } from "@react-pdf/renderer";
import { create, type QRCodeErrorCorrectionLevel } from "qrcode";

import { QR_SIZE } from "./theme";

const DEFAULT_LOGO_PATH = join(
  process.cwd(),
  "public/brand/logo-marque-purple.png",
);
const QUIET_ZONE = 4;
const DEFAULT_LOGO_SCALE = 0.18;
const LOGO_PADDING = 1;
const LOGO_ASPECT_RATIO = 2067 / 1884;

export type QRLogoSource = string | Buffer;

export interface QRCodeRenderOptions {
  /** Rendered size in PDF points. */
  size?: number;
  /** qrcode's error-correction level. H is the branded default. */
  errorCorrectionLevel?: QRCodeErrorCorrectionLevel;
  /** Set to null to render a deliberately unbranded QR code. */
  logo?: QRLogoSource | null;
  /** Logo width as a fraction of the QR symbol width, excluding quiet space. */
  logoScale?: number;
}

type QRCodeOptionsOrSize = QRCodeRenderOptions | number;

function normalizeOptions(
  optionsOrSize: QRCodeOptionsOrSize | undefined,
): QRCodeRenderOptions {
  if (typeof optionsOrSize === "number") {
    return { size: optionsOrSize };
  }

  return optionsOrSize ?? {};
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

/**
 * Render a QR code as a React-PDF element with a centered Scouts marque by
 * default. This module is server-only because local PNG paths are resolved
 * for React-PDF's Node renderer.
 */
export function renderQrCode(
  value: string,
  optionsOrSize?: QRCodeOptionsOrSize,
): ReactElement {
  const options = normalizeOptions(optionsOrSize);
  validateRenderOptions(options);

  const size = options.size ?? QR_SIZE;
  const logo = options.logo === null ? null : options.logo ?? DEFAULT_LOGO_PATH;
  const logoScale = options.logoScale ?? DEFAULT_LOGO_SCALE;
  const { modules } = create(value, {
    errorCorrectionLevel: options.errorCorrectionLevel ?? "H",
  });
  const { size: moduleCount, data } = modules;
  const extent = moduleCount + QUIET_ZONE * 2;
  const moduleSize = size / extent;

  let path = "";
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (data[row * moduleCount + col]) {
        path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
  }

  const logoWidth = moduleCount * logoScale;
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;
  const logoX = (extent - logoWidth) / 2;
  const logoY = (extent - logoHeight) / 2;
  const knockoutX = logoX - LOGO_PADDING;
  const knockoutY = logoY - LOGO_PADDING;
  const knockoutWidth = logoWidth + LOGO_PADDING * 2;
  const knockoutHeight = logoHeight + LOGO_PADDING * 2;

  const qrSvg = createElement(
    Svg,
    {
      width: size,
      height: size,
      viewBox: `0 0 ${extent} ${extent}`,
      style: { position: "absolute", left: 0, top: 0 },
    },
    createElement(Rect, {
      x: 0,
      y: 0,
      width: extent,
      height: extent,
      fill: "#FFFFFF",
    }),
    createElement(Path, { d: path, fill: "#000000" }),
    logo
      ? createElement(Rect, {
          x: knockoutX,
          y: knockoutY,
          width: knockoutWidth,
          height: knockoutHeight,
          fill: "#FFFFFF",
        })
      : null,
  );

  return createElement(
    View,
    {
      style: {
        position: "relative",
        width: size,
        height: size,
      },
    },
    qrSvg,
    logo
      ? createElement(Image, {
          src: logo,
          style: {
            position: "absolute",
            left: logoX * moduleSize,
            top: logoY * moduleSize,
            width: logoWidth * moduleSize,
            height: logoHeight * moduleSize,
          },
        })
      : null,
  );
}

/**
 * Backwards-compatible name for callers that previously passed only a size.
 * Omitting the second argument now opts into the branded defaults.
 */
export function qrCodeSvg(
  value: string,
  optionsOrSize?: QRCodeOptionsOrSize,
): ReactElement {
  return renderQrCode(value, optionsOrSize);
}
