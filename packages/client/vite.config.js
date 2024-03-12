import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "src",
  envDir: "..",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  plugins: [
    react({
      include: "**/*.{jsx,tsx}",
    }),
  ],
});
