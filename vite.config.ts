import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv, type Plugin } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

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
        if (
          file.type === "asset" &&
          file.fileName.endsWith(".css") &&
          typeof file.source === "string"
        ) {
          file.source = flatten(file.source);
        }
      }
    },
  };
}

export default defineConfig(({ command, mode }) => {
  // Every VITE_ value from .env files is available as import.meta.env.* in
  // both the browser and server bundles.
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), "VITE_"))) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
      }),
      // Builds the Cloudflare Worker into .output (see wrangler.jsonc).
      ...(command === "build" ? [nitro({ preset: "cloudflare-module" })] : []),
      viteReact(),
      flattenCssLayers(),
    ],
    // Public (publishable) backend values baked in as a fallback so a build
    // without a .env file never ships a blank screen. These are safe to
    // expose; they are not secrets.
    define: {
      ...envDefine,
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        process.env["VITE_SUPABASE_URL"] || "https://ioejabwtcfkbyhejklqe.supabase.co",
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
          "sb_publishable_RtxD2GcILF5yeaKz5cAfLA_BSP3gxbn",
      ),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
        process.env["VITE_SUPABASE_PROJECT_ID"] || "ioejabwtcfkbyhejklqe",
      ),
    },
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
    },
    server: { host: "::", port: 8080 },
    build: {
      // cloudflare:workers is provided by the Cloudflare runtime. Keep it out
      // of the bundle so CI can build without resolving it locally.
      rolldownOptions: {
        external: ["cloudflare:workers"],
      },
    },
  };
});
