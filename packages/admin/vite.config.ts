import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  root: "src",
  envDir: "..",
  base: process.env.APP_ROOT,
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  plugins: [
    react({
      include: "**/*.{jsx,tsx}",
    }),
  ],
  define: {
    __APP_ROOT__: JSON.stringify(process.env.APP_ROOT),
  },
});
