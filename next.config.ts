import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    // Poster PDF generation reads these fonts and the brand logo at runtime via
    // fs; @vercel/nft can't see the access, so trace them into the poster-pdf
    // route's function.
    "/api/admin/games/\\[gameId\\]/poster-pdf": [
      "src/server/poster/fonts/**/*",
      "public/brand/logo-linear-white.png",
      "public/brand/logo-marque-purple.png",
    ],
  },
};

export default nextConfig;
