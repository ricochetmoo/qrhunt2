import "server-only";

import { createElement } from "react";

import { renderToBuffer } from "@react-pdf/renderer";

import { LabelSheetDocument } from "./label-sheet-document";
import { PosterDocument } from "./poster-document";
import { getAppUrl } from "./url";

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
  return renderPosterDocument(PosterDocument, input);
}

export async function buildGameLabelSheetPdf(
  input: BuildGamePosterPdfInput,
): Promise<Uint8Array> {
  return renderPosterDocument(
    LabelSheetDocument,
    input,
  );
}

function renderPosterDocument(
  PosterComponent:
    | typeof PosterDocument
    | typeof LabelSheetDocument,
  input: BuildGamePosterPdfInput,
): Promise<Uint8Array> {
  if (input.codes.length === 0) {
    throw new Error("poster PDF: at least one QR code is required");
  }

  // renderToBuffer's parameter type is keyed to <Document>'s own props, which a
  // wrapper component's element type can't structurally satisfy.
  const tree = createElement(PosterComponent, {
    game: input.game,
    codes: input.codes,
    appUrl: getAppUrl(),
  }) as Parameters<typeof renderToBuffer>[0];

  return renderToBuffer(tree);
}
