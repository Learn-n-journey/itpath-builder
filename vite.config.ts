// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

/**
 * Tailwind v4 wraps every rule in `@layer`. Browsers without cascade-layer
 * support (older mobile Chrome / Android WebView) drop those rules entirely,
 * which renders the app as unstyled text and links. Flattening the top level
 * layers keeps the same source order, so the cascade is unchanged for modern
 * browsers while old ones can finally read the stylesheet.
 */
function flattenCssLayers(): Plugin {
  const flatten = (css: string): string => {
    let out = "";
    let i = 0;
    const closers: number[] = [];
    let depth = 0;
    while (i < css.length) {
      if (css.startsWith("@layer", i)) {
        const semi = css.indexOf(";", i);
        const brace = css.indexOf("{", i);
        if (brace === -1 || (semi !== -1 && semi < brace)) {
          // Bare `@layer a, b;` ordering statement: drop it.
          i = semi + 1;
          continue;
        }
        if (depth === 0) {
          closers.push(depth);
          depth += 1;
          i = brace + 1;
          continue;
        }
      }
      const ch = css[i];
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (closers.length > 0 && closers[closers.length - 1] === depth) {
          closers.pop();
          i += 1;
          continue;
        }
      }
      out += ch;
      i += 1;
    }
    return out;
  };

  return {
    name: "itpath-flatten-css-layers",
    apply: "build",
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === "asset" && file.fileName.endsWith(".css") && typeof file.source === "string") {
          file.source = flatten(file.source);
        }
      }
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [flattenCssLayers()],
  },
});
