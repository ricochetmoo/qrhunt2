export const ACCENT = "#006ddf";

export const PAGE = {
  width: 595.28,
  height: 841.89,
} as const;

export const TOP_BAR_HEIGHT = 100;

const LOGO_ASPECT = 300 / 256;
const LOGO_HEIGHT = 72;
export const LOGO = {
  height: LOGO_HEIGHT,
  width: LOGO_HEIGHT * LOGO_ASPECT,
} as const;

export const BODY_PADDING_X = 48;
export const BODY_PADDING_Y = 28;

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

export const QR_SIZE = 400;

export const FONT_FAMILY = "Nunito Sans";

export const TYPE = {
  gameName: { fontSize: 30, fontWeight: 700 as const, lineHeight: 1.15 },
  codeName: { fontSize: 22, fontWeight: 400 as const, lineHeight: 1.3 },
  helper: { fontSize: 14, fontWeight: 400 as const },
  codeValue: { fontSize: 30, fontWeight: 700 as const, letterSpacing: 8 },
} as const;
