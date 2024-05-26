import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as child from "child_process";

const commitHash = child
  .execSync("git rev-parse --short HEAD")
  .toString()
  .trim();

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
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
});
