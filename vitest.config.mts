import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the pure logic (tax code, validation, documents, comuni).
 * The end-to-end suites in tests/ are a different thing: they drive a real
 * browser against a running instance, and `pnpm test:e2e` still runs them.
 */
export default defineConfig({
  test: {
    // Everything under test is Node-only: no component needs a DOM.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    // There is no bundler in the test path, so the tsconfig `@/*` path has to
    // be repeated here or `@/lib/fields` fails to resolve.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
