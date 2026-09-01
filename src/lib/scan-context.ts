/**
 * Heuristics for where a scanned link opened. Browser-safe.
 *
 * The one that matters: the iOS Control Centre Code Scanner (and most in-app
 * scanners) render pages in a WKWebView whose user agent lacks the trailing
 * "Safari/xxx" token that real Safari always sends. That context is throwaway
 * — it won't persist cookies — so the join funnel warns and redirects players
 * to the native Camera app. Heuristic only; the funnel still verifies with a
 * live persistence probe before trusting any context.
 */
export type ScanContext = {
  platform: "ios" | "android" | "other";
  /** Likely an in-app web view (iOS Code Scanner, Snapchat, Android `wv`, …). */
  inAppWebView: boolean;
  standalone: boolean;
};

export function detectScanContext(
  userAgent: string,
  options: { standalone?: boolean } = {},
): ScanContext {
  const ua = userAgent || "";
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  const inAppWebView = isIos
    ? !/Safari\//.test(ua)
    : isAndroid
      ? /\bwv\b/.test(ua)
      : false;

  return {
    platform: isIos ? "ios" : isAndroid ? "android" : "other",
    inAppWebView,
    standalone: Boolean(options.standalone),
  };
}
