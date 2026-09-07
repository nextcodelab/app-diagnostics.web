import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",

      manifest: {
        name: "App Diagnostics",
        short_name: "Diagnostics",
        description: "Application diagnostics and log viewer",
        display: "standalone",
        start_url: "./",
        scope: "./",
        theme_color: "#ffffff",
        background_color: "#ffffff",

        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },

      workbox: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,webp}",
        ],
      },
    }),
  ],

  base: "./",

  server: {
    host: "0.0.0.0",
    https: {
      cert: "./192.168.0.106+2.pem",
      key: "./192.168.0.106+2-key.pem",
    },
  },

  preview: {
    host: "0.0.0.0",
    https: {
      cert: "./192.168.0.106+2.pem",
      key: "./192.168.0.106+2-key.pem",
    },
  },

  resolve: {
    alias: {
      "@": fileURLToPath(
        new URL("./src", import.meta.url),
      ),
    },
  },
});