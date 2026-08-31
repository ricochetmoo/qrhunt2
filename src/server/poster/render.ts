import "server-only";

import { createElement } from "react";

import { renderToBuffer } from "@react-pdf/renderer";

import { PosterDocument } from "./poster-document";

export interface PosterCode {
  name: string;
  code: string;
}
export interface BuildGamePosterPdfInput {
  game: { name: string };
  codes: PosterCode[];
}

export async function buildGamePosterPdf(
  input: BuildGamePosterPdfInput,
): Promise<Uint8Array> {
  if (input.codes.length === 0) {
    throw new Error("buildGamePosterPdf: at least one QR code is required");
  }

  // renderToBuffer's parameter type is keyed to <Document>'s own props, which a
  // wrapper component's element type can't structurally satisfy.
  const tree = createElement(PosterDocument, {
    game: input.game,
    codes: input.codes,
  }) as Parameters<typeof renderToBuffer>[0];

  return renderToBuffer(tree);
}
