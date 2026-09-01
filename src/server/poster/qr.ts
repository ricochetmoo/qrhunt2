import "server-only";

import { createElement, type ReactElement } from "react";

import { Image, Path, Rect, Svg, View } from "@react-pdf/renderer";

import { ACCENT } from "./theme";
import { buildQrPath, createQrModel } from "./qr-core";
import type { QRCodeRenderOptions } from "./qr-core";

export type { BrandedQrSvgOptions, QRCodeRenderOptions, QRLogoSource } from "./qr-core";
export { buildBrandedQrSvg } from "./qr-core";

type QRCodeOptionsOrSize = QRCodeRenderOptions | number;

function normalizeOptions(
  optionsOrSize: QRCodeOptionsOrSize | undefined,
): QRCodeRenderOptions {
  if (typeof optionsOrSize === "number") {
    return { size: optionsOrSize };
  }

  return optionsOrSize ?? {};
}

/** Render a QR code as a React-PDF element with the branded Scouts marque. */
export function renderQrCode(
  value: string,
  optionsOrSize?: QRCodeOptionsOrSize,
): ReactElement {
  const model = createQrModel(value, normalizeOptions(optionsOrSize));
  const moduleSize = model.size / model.extent;
  const path = buildQrPath(model);

  const qrSvg = createElement(
    Svg,
    {
      width: model.size,
      height: model.size,
      viewBox: `0 0 ${model.extent} ${model.extent}`,
      style: { position: "absolute", left: 0, top: 0 },
    },
    createElement(Rect, {
      x: 0,
      y: 0,
      width: model.extent,
      height: model.extent,
      fill: "#FFFFFF",
    }),
    createElement(Path, { d: path, fill: ACCENT }),
  );

  return createElement(
    View,
    {
      style: {
        position: "relative",
        width: model.size,
        height: model.size,
      },
    },
    qrSvg,
    model.logo
      ? createElement(Image, {
          src: model.logo,
          style: {
            position: "absolute",
            left: model.logoX * moduleSize,
            top: model.logoY * moduleSize,
            width: model.logoWidth * moduleSize,
            height: model.logoHeight * moduleSize,
          },
        })
      : null,
  );
}

/** Backwards-compatible name for callers that previously passed only a size. */
export function qrCodeSvg(
  value: string,
  optionsOrSize?: QRCodeOptionsOrSize,
): ReactElement {
  return renderQrCode(value, optionsOrSize);
}
