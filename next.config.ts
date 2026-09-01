import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    // Poster PDF generation reads these fonts and the brand logo at runtime via
    // fs; @vercel/nft can't see the access, so trace them into the poster-pdf
    // route's function.
    // Use a route glob rather than escaping the dynamic segment name. This
    // keeps the rule aligned with the path emitted by both Next.js and Vercel.
    "/api/admin/games/*/poster-pdf": [
      "./src/server/poster/fonts/**/*",
      "./public/brand/logo-linear-white.png",
      "./public/brand/logo-marque-purple.png",
      // pdfkit loads its standard fonts through package `imports`, which
      // output file tracing cannot resolve from the externalized renderer.
      "./node_modules/.pnpm/pdfkit@*/node_modules/pdfkit/js/standard-fonts/**/*",
    ],
    "/api/admin/games/*/qr-images": [
      "./public/brand/logo-linear-white.png",
      "./public/brand/logo-marque-purple.png",
    ],
  },
};

export default nextConfig;
