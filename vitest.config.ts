import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: [
      // Next.js 16 dropped its package.json "exports" map, so Vite's
      // resolver (unlike Node's legacy fallback) can no longer infer the
      // ".js" extension for deep imports like "next/server" — needed
      // because next-auth imports it that way internally.
      { find: /^next\/server$/, replacement: "next/server.js" },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    server: {
      // next-auth is normally left external (loaded via Node's own resolver,
      // bypassing the alias above); inlining it routes its imports through
      // Vite's resolver instead, where the alias applies.
      deps: { inline: [/next-auth/, /@auth\/core/] },
    },
  },
});
