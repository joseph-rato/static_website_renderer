import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@pagoda/schema": path.resolve(__dirname, "../../packages/schema/src/index.ts"),
      "@pagoda/renderer/server": path.resolve(__dirname, "../../packages/renderer/src/server.tsx"),
      "@pagoda/renderer": path.resolve(__dirname, "../../packages/renderer/src/index.ts"),
    },
  },
});
