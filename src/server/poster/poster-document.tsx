import { join } from "node:path";

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { registerPosterFonts } from "./fonts";
import { renderQrCode } from "./qr";
import {
  ACCENT,
  BODY_PADDING_X,
  BODY_PADDING_Y,
  FONT_FAMILY,
  LOGO,
  QR_SIZE,
  SPACE,
  TOP_BAR_HEIGHT,
  TYPE,
} from "./theme";

const LOGO_PATH = join(process.cwd(), "public/brand/logo-linear-white.png");

registerPosterFonts();

export interface PosterDocumentCode {
  name: string;
  code: string;
}

export interface PosterDocumentProps {
  game: { name: string };
  codes: PosterDocumentCode[];
  appUrl: string;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    color: "#1A1A1A",
    position: "relative",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: TOP_BAR_HEIGHT,
    backgroundColor: ACCENT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: BODY_PADDING_X,
  },
  logo: {
    width: LOGO.width,
    height: LOGO.height,
  },
  body: {
    marginTop: TOP_BAR_HEIGHT,
    marginBottom: 36,
    paddingHorizontal: BODY_PADDING_X,
    paddingTop: BODY_PADDING_Y,
  },
  gameName: {
    fontSize: TYPE.gameName.fontSize,
    fontWeight: TYPE.gameName.fontWeight,
    lineHeight: TYPE.gameName.lineHeight,
  },
  codeName: {
    fontSize: TYPE.codeName.fontSize,
    marginTop: SPACE.md,
  },
  qr: {
    alignSelf: "center",
    marginTop: SPACE.md,
  },
  helper: {
    fontSize: TYPE.helper.fontSize,
    marginTop: SPACE.lg,
  },
  codeBox: {
    alignSelf: "center",
    marginTop: SPACE.lg,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: "#1A1A1A",
    borderStyle: "solid",
    borderRadius: 6,
  },
  codeValue: {
    fontSize: TYPE.codeValue.fontSize,
    fontWeight: TYPE.codeValue.fontWeight,
    letterSpacing: TYPE.codeValue.letterSpacing,
    textAlign: "center",
  },
});

export function PosterDocument({ game, codes, appUrl }: PosterDocumentProps) {
  return (
    <Document title={`${game.name} — QR posters`}>
      {codes.map((qr, index) => (
        <Page key={index} size="A4" orientation="portrait" style={styles.page}>
          <View style={styles.topBar} fixed>
            {/* react-pdf Image has no alt prop */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={LOGO_PATH} style={styles.logo} />
          </View>
          <View style={styles.body}>
            <Text style={styles.gameName}>{game.name}</Text>
            <Text style={styles.codeName}>{qr.name}</Text>
            <View style={styles.qr}>
              {renderQrCode(`${appUrl}/s/${encodeURIComponent(qr.code)}`, { size: QR_SIZE })}
            </View>
            <Text style={styles.helper}>Can&apos;t scan? Enter this code:</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeValue}>{qr.code.toUpperCase()}</Text>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
}
