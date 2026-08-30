import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Font } from "@react-pdf/renderer";

import { FONT_FAMILY } from "./theme";

// @fontsource/nunito-sans ships only .woff/.woff2; fontkit (via react-pdf) needs
// .ttf/.otf, so Regular and Bold are vendored here as static SIL OFL instances
// of the official Nunito Sans variable font (see fonts/OFL.txt).
const FONTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "fonts");

let registered = false;

export function registerPosterFonts(): void {
  if (registered) return;
  registered = true;

  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: join(FONTS_DIR, "NunitoSans-Regular.ttf"), fontWeight: 400 },
      { src: join(FONTS_DIR, "NunitoSans-Bold.ttf"), fontWeight: 700 },
    ],
  });
}
