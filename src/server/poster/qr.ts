import { createElement, type ReactElement } from "react";

import { Path, Rect, Svg } from "@react-pdf/renderer";
import { create } from "qrcode";

import { QR_SIZE } from "./theme";

const QUIET_ZONE = 2;

export function qrCodeSvg(value: string, size: number = QR_SIZE): ReactElement {
  const { modules } = create(value, { errorCorrectionLevel: "M" });
  const { size: count, data } = modules;
  const extent = count + QUIET_ZONE * 2;

  let d = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (data[row * count + col]) {
        d += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
  }

  return createElement(
    Svg,
    { width: size, height: size, viewBox: `0 0 ${extent} ${extent}` },
    createElement(Rect, {
      x: 0,
      y: 0,
      width: extent,
      height: extent,
      fill: "#FFFFFF",
    }),
    createElement(Path, { d, fill: "#000000" }),
  );
}
