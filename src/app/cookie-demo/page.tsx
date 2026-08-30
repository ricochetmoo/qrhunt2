import type { Metadata } from "next";

import { CookieDemo } from "./cookie-demo-client";

export const metadata: Metadata = {
  title: "Cookie context demo · QR Hunt",
  robots: { index: false, follow: false },
};

/**
 * Developer harness for the camera-scan cookie question: open this page in
 * different contexts (in-browser, via the native camera QR, from an in-app
 * scanner, from an installed PWA) and compare the identity/device panels to
 * see which contexts share the anonymous session and storage.
 */
export default function CookieDemoPage() {
  return <CookieDemo />;
}
