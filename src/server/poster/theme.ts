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

// The optional PDF is laid out for common 4-up A4 label sheets: two columns
// by two rows, with a small stock margin and gutter around each label.
export const LABELS_PER_PAGE = 4;
export const LABEL_PAGE_MARGIN_X = 11;
export const LABEL_PAGE_MARGIN_Y = 20;
export const LABEL_GAP_X = 12;
export const LABEL_GAP_Y = 12;
export const LABEL_WIDTH =
  (PAGE.width - LABEL_PAGE_MARGIN_X * 2 - LABEL_GAP_X) / 2;
export const LABEL_HEIGHT =
  (PAGE.height - LABEL_PAGE_MARGIN_Y * 2 - LABEL_GAP_Y) / 2;
export const LABEL_TOP_BAR_HEIGHT = 58;
export const LABEL_PADDING_X = 18;
export const LABEL_PADDING_Y = 14;

const LABEL_LOGO_HEIGHT = 44;
export const LABEL_LOGO = {
  height: LABEL_LOGO_HEIGHT,
  width: LABEL_LOGO_HEIGHT * LOGO_ASPECT,
} as const;

export const POSTER_QR_SIZE = 204;

export const LABEL_TYPE = {
  gameName: { fontSize: 16, fontWeight: 700 as const, lineHeight: 1.15 },
  helper: { fontSize: 10, fontWeight: 400 as const },
  codeValue: { fontSize: 21, fontWeight: 700 as const, letterSpacing: 5 },
} as const;
