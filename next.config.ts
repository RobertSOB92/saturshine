import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tryb standalone tworzy malutki serwer specjalnie na VPS z małym RAM
  output: "standalone",
  // Wyłącz strict mode w produkcji jeśli powoduje problemy z re-renderami
  reactStrictMode: true,

  // Nagłówki bezpieczeństwa + PWA Service Worker
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },

  // Umożliwia optymalizację obrazów z zewnętrznych domen (Supabase Storage)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/**",
      },
    ],
  },
};

export default nextConfig;
