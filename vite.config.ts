import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [
    viteSingleFile(),
  ],

  base: "./",

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});