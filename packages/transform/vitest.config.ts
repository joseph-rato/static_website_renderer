import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@pagoda/schema": path.resolve(__dirname, "../schema/src/index.ts"),
    },
  },
});
