import { join } from "node:path";

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { PosterDocumentCode } from "./poster-document";
import { registerPosterFonts } from "./fonts";
import { renderQrCode } from "./qr";
import { buildQrPayload } from "./url";
import {
  ACCENT,
  FONT_FAMILY,
  LABELS_PER_PAGE,
  LABEL_GAP_X,
  LABEL_GAP_Y,
  LABEL_HEIGHT,
  LABEL_LOGO,
  LABEL_PAGE_MARGIN_X,
  LABEL_PAGE_MARGIN_Y,
  LABEL_PADDING_X,
  LABEL_PADDING_Y,
  LABEL_TOP_BAR_HEIGHT,
  LABEL_TYPE,
  LABEL_WIDTH,
  POSTER_QR_SIZE,
  SPACE,
} from "./theme";

const LOGO_PATH = join(
  process.cwd(),
  "public/brand/logo-stacked-digital-white.svg",
);

registerPosterFonts();

export interface LabelSheetDocumentProps {
  game: { name: string };
  codes: PosterDocumentCode[];
  appUrl: string;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    color: "#1A1A1A",
    position: "relative",
    backgroundColor: "#FFFFFF",
  },
  label: {
    position: "absolute",
    width: LABEL_WIDTH,
    height: LABEL_HEIGHT,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: LABEL_TOP_BAR_HEIGHT,
    backgroundColor: ACCENT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: LABEL_PADDING_X,
  },
  logo: {
    width: LABEL_LOGO.width,
    height: LABEL_LOGO.height,
  },
  body: {
    position: "absolute",
    top: LABEL_TOP_BAR_HEIGHT,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: LABEL_PADDING_X,
    paddingTop: LABEL_PADDING_Y,
  },
  gameName: {
    fontSize: LABEL_TYPE.gameName.fontSize,
    fontWeight: LABEL_TYPE.gameName.fontWeight,
    lineHeight: LABEL_TYPE.gameName.lineHeight,
    textAlign: "center",
  },
  subtitle: {
    fontSize: LABEL_TYPE.subtitle.fontSize,
    fontWeight: LABEL_TYPE.subtitle.fontWeight,
    lineHeight: LABEL_TYPE.subtitle.lineHeight,
    color: "#475569",
    marginTop: SPACE.xs,
    textAlign: "center",
  },
  qr: {
    alignSelf: "center",
    marginTop: SPACE.sm,
  },
  helper: {
    fontSize: LABEL_TYPE.helper.fontSize,
    color: "#475569",
    marginTop: SPACE.sm,
  },
  codeBox: {
    alignSelf: "center",
    marginTop: SPACE.xs,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "#1A1A1A",
    borderStyle: "solid",
    borderRadius: 4,
  },
  codeValue: {
    fontSize: LABEL_TYPE.codeValue.fontSize,
    fontWeight: LABEL_TYPE.codeValue.fontWeight,
    letterSpacing: LABEL_TYPE.codeValue.letterSpacing,
    textAlign: "center",
  },
});

const LABEL_POSITIONS = [
  { left: LABEL_PAGE_MARGIN_X, top: LABEL_PAGE_MARGIN_Y },
  {
    left: LABEL_PAGE_MARGIN_X + LABEL_WIDTH + LABEL_GAP_X,
    top: LABEL_PAGE_MARGIN_Y,
  },
  {
    left: LABEL_PAGE_MARGIN_X,
    top: LABEL_PAGE_MARGIN_Y + LABEL_HEIGHT + LABEL_GAP_Y,
  },
  {
    left: LABEL_PAGE_MARGIN_X + LABEL_WIDTH + LABEL_GAP_X,
    top: LABEL_PAGE_MARGIN_Y + LABEL_HEIGHT + LABEL_GAP_Y,
  },
] as const;

function chunkCodes(codes: PosterDocumentCode[]): PosterDocumentCode[][] {
  const pages: PosterDocumentCode[][] = [];

  for (let index = 0; index < codes.length; index += LABELS_PER_PAGE) {
    pages.push(codes.slice(index, index + LABELS_PER_PAGE));
  }

  return pages;
}

export function LabelSheetDocument({
  game,
  codes,
  appUrl,
}: LabelSheetDocumentProps) {
  return (
    <Document title={`${game.name} - QR label sheets`}>
      {chunkCodes(codes).map((pageCodes, pageIndex) => (
        <Page
          key={pageIndex}
          size="A4"
          orientation="portrait"
          style={styles.page}
        >
          {pageCodes.map((qr, labelIndex) => {
            const position = LABEL_POSITIONS[labelIndex];

            return (
              <View key={qr.code} style={[styles.label, position]}>
                <View style={styles.topBar}>
                  {/* react-pdf Image has no alt prop */}
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={LOGO_PATH} style={styles.logo} />
                </View>
                <View style={styles.body}>
                  <Text style={styles.gameName}>{game.name} QR Hunt</Text>
                  <Text style={styles.subtitle}>Scan to start the game</Text>
                  <View style={styles.qr}>
                    {renderQrCode(buildQrPayload(qr.code, appUrl), {
                      size: POSTER_QR_SIZE,
                    })}
                  </View>
                  <Text style={styles.helper}>Can&apos;t scan? Enter this code:</Text>
                  <View style={styles.codeBox}>
                    <Text style={styles.codeValue}>{qr.code.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </Page>
      ))}
    </Document>
  );
}
