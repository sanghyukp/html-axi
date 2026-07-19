import { chmod, copyFile, cp, mkdir, readFile } from "node:fs/promises";

import * as esbuild from "esbuild";

import { DESIGN_LOCAL_ASSET_FILES } from "../src/design-reference.js";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

await mkdir("dist", { recursive: true });

await esbuild.build({
  entryPoints: ["bin/ai-dev-axi.js"],
  outfile: "dist/cli.mjs",
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  target: "node22",
  define: {
    "process.env.LAVISH_AXI_BUILD_UMAMI_HOST": JSON.stringify(process.env.LAVISH_AXI_UMAMI_HOST || ""),
    "process.env.LAVISH_AXI_BUILD_UMAMI_WEBSITE_ID": JSON.stringify(process.env.LAVISH_AXI_UMAMI_WEBSITE_ID || ""),
    "process.env.LAVISH_AXI_BUILD_VERSION": JSON.stringify(packageJson.version),
  },
});

await chmod("dist/cli.mjs", 0o755);
await copyFile("src/chrome-client.js", "dist/chrome-client.js");
await copyFile("src/chrome.css", "dist/chrome.css");
await mkdir("dist/design", { recursive: true });
// Vendored from the CDN under assets/design rather than pulled from node_modules, so what the
// browser loads locally is byte-for-byte what the CDN snippet would have served. It also
// decouples the artifact-facing Mermaid from the older release the whiteboard converter pins.
for (const asset of DESIGN_LOCAL_ASSET_FILES) {
  await copyFile(`assets/design/${asset}`, `dist/design/${asset}`);
}

// Whiteboard frame: a self-contained browser bundle (Excalidraw + the Mermaid
// converter + its exactly-pinned mermaid + React) served from
// /whiteboard-assets/ by an embedded frame for every rendered Mermaid diagram
// in a `.mermaid` container.
// Everything is vendored so the eagerly loaded whiteboards work fully offline.
await mkdir("dist/whiteboard", { recursive: true });
await esbuild.build({
  entryPoints: { whiteboard: "src/whiteboard-frame.js" },
  outdir: "dist/whiteboard",
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  conditions: ["production"],
  loader: { ".woff2": "file", ".woff": "file", ".ttf": "file" },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.IS_PREACT": '"false"',
  },
});

// Excalidraw lazily fetches canvas fonts from `EXCALIDRAW_ASSET_PATH/fonts/`.
// Vendor every family except Xiaolai (12 MB of CJK glyphs; those fall back to
// Excalidraw's CDN fallback or the system font when missing locally).
const fontFamilies = ["Assistant", "Cascadia", "ComicShanns", "Excalifont", "Liberation", "Lilita", "Nunito", "Virgil"];
await mkdir("dist/whiteboard/fonts", { recursive: true });
for (const family of fontFamilies) {
  await cp(`node_modules/@excalidraw/excalidraw/dist/prod/fonts/${family}`, `dist/whiteboard/fonts/${family}`, {
    recursive: true,
  });
}
