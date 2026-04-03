import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup/vitest.setup.js"],
    include: [
      "src/components/GraphEditor/utils/**/*.test.js",
      "tests/unit/**/*.unit.test.js",
      "tests/integration/**/*.integration.test.jsx",
    ],
    exclude: ["tests/e2e/**"],
  },
});
