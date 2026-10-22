import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages read live job and result state from the database on every request,
  // so the app uses plain dynamic rendering rather than Cache Components.
  // Only set when building the static snapshot (scripts/export-static.mjs).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3", "pdfjs-dist"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
