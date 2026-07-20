import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: [
      // Next.js 16 dropped its package.json "exports" map, so Vite's
      // resolver (unlike Node's legacy fallback) can no longer infer the
      // ".js" extension for deep imports like "next/server" (used directly
      // by src/proxy.ts).
      { find: /^next\/server$/, replacement: "next/server.js" },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
