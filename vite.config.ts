import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "offline.html",
        "icons/tarot-apple-touch-icon.png",
        "icons/tarot-app-icon-192.png",
        "icons/tarot-app-icon-512.png",
        "icons/tarot-app-icon-maskable-512.png",
      ],
      manifest: {
        name: "Tarot Trainer",
        short_name: "Tarot",
        description: "Practice Rider-Waite tarot reading with guided feedback.",
        lang: "ko",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#22223b",
        background_color: "#f5f0e6",
        icons: [
          {
            src: "/icons/tarot-app-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/tarot-app-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/tarot-app-icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/offline.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,json}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === "/cards/cards-manifest.json",
            handler: "NetworkFirst",
            options: {
              cacheName: "tarot-card-manifest-v2",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/cards/"),
            handler: "CacheFirst",
            options: {
              cacheName: "tarot-card-images-v2",
              expiration: {
                maxEntries: 160,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
            options: {
              cacheName: "tarot-api",
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3002",
        changeOrigin: true,
      },
    },
  },
});
