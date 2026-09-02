import { join } from "node:path";

import { Font } from "@react-pdf/renderer";

import { FONT_FAMILY } from "./theme";

// @fontsource/nunito-sans ships only .woff/.woff2; fontkit (via react-pdf) needs
// .ttf/.otf, so Regular and Bold are vendored here as static SIL OFL instances
// of the official Nunito Sans variable font (see fonts/OFL.txt).
// Resolve from the runtime function root. Next's webpack compilation can
// inline import.meta.url as the build machine's absolute `/vercel/path0` path,
// which is not present when the traced function runs in a serverless lambda.
const FONTS_DIR = join(process.cwd(), "src/server/poster/fonts");

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
