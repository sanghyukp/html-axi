import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DESIGN_LOCAL_ASSET_FILES,
  MERMAID_LOCAL_ASSET_FILE,
  MERMAID_VERSION,
  TAILWIND_BROWSER_VERSION,
} from "../src/design-reference.js";

test("check script runs all verification commands", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const checkCommands = packageJson.scripts.check.split(" && ");

  assert.deepEqual(checkCommands, [
    "npm run build",
    "npm run lint",
    "npm run format:check",
    "npm run typecheck",
    "npm test",
    "node scripts/build-skill.js --check",
  ]);
});

test("installable skill stays in sync with the no-args home output", async () => {
  const { createSkillMarkdown } = await import("../src/skill.js");
  const committed = await readFile(new URL("../skills/ai-dev/SKILL.md", import.meta.url), "utf8");

  assert.equal(committed, createSkillMarkdown(), "run `npm run build:skill` and commit the result");
});

test("published package includes the installable skill", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.ok(packageJson.files.includes("skills/ai-dev"));
});

test("lavish-design agent skill is marked internal for skills CLI discovery", async () => {
  const skillMd = await readFile(new URL("../.agents/skills/lavish-design/SKILL.md", import.meta.url), "utf8");
  const frontmatter = skillMd.slice(4, skillMd.indexOf("\n---\n", 4));

  assert.match(frontmatter, /^name: lavish-design$/m);
  assert.match(frontmatter, /^metadata:\n {2}internal: true$/m);
});

test("public lavish skill is not marked internal", async () => {
  const skillMd = await readFile(new URL("../skills/ai-dev/SKILL.md", import.meta.url), "utf8");
  const frontmatter = skillMd.slice(4, skillMd.indexOf("\n---\n", 4));

  assert.doesNotMatch(frontmatter, /^metadata:\n {2}internal: true$/m);
});

test("build copies local design assets for published artifact injection", async () => {
  const buildScript = await readFile(new URL("../scripts/build.js", import.meta.url), "utf8");

  // The copy loop is driven by DESIGN_LOCAL_ASSET_FILES, so assert the wiring plus the fact
  // that every declared asset is actually vendored - a name added to the list with no file
  // behind it would otherwise only surface as a build crash.
  assert.match(buildScript, /assets\/design/);
  assert.match(buildScript, /dist\/design/);
  assert.match(buildScript, /DESIGN_LOCAL_ASSET_FILES/);

  for (const asset of DESIGN_LOCAL_ASSET_FILES) {
    await readFile(new URL(`../assets/design/${asset}`, import.meta.url));
  }
});

test("package metadata matches the GitHub repository used for npm provenance", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.repository.url, "git+https://github.com/sanghyukp/html-axi.git");
  assert.equal(packageJson.bugs.url, "https://github.com/sanghyukp/html-axi/issues");
  assert.equal(packageJson.homepage, "https://github.com/sanghyukp/html-axi#readme");
});

test("pnpm lock root importer matches the publish manifest", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const pnpmLock = await readFile(new URL("../pnpm-lock.yaml", import.meta.url), "utf8");

  for (const [name, specifier] of Object.entries(packageJson.dependencies)) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedSpecifier = specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    assert.match(pnpmLock, new RegExp(`["']?${escapedName}["']?:[\\s\\S]*?specifier: ${escapedSpecifier}`));
  }
});

test("release workflow publishes from the release tag checkout", async () => {
  const workflow = await readFile(new URL("../.github/workflows/release-please.yml", import.meta.url), "utf8");

  assert.match(
    workflow,
    /uses: actions\/checkout@v6\n\s+if: \$\{\{ steps\.release\.outputs\.release_created \}\}\n\s+with:\n\s+ref: \$\{\{ steps\.release\.outputs\.tag_name \}\}/,
  );
});

test("release workflow keeps telemetry env during npm publish prepack", async () => {
  const workflow = await readFile(new URL("../.github/workflows/release-please.yml", import.meta.url), "utf8");

  assert.match(
    workflow,
    /run: npm publish --access public --provenance\n\s+if: \$\{\{ steps\.release\.outputs\.release_created \}\}\n\s+env:\n\s+LAVISH_AXI_UMAMI_HOST: https:\/\/a\.kunchenguid\.com\n\s+LAVISH_AXI_UMAMI_WEBSITE_ID: \$\{\{ vars\.LAVISH_AXI_UMAMI_WEBSITE_ID \}\}/,
  );
});

test("vendored design assets match the versions the CDN snippets advertise", async () => {
  const read = (name) => readFile(new URL(`../assets/design/${name}`, import.meta.url), "utf8");

  for (const asset of DESIGN_LOCAL_ASSET_FILES) {
    const contents = await read(asset);
    assert.ok(contents.length > 0, `${asset} is vendored and non-empty`);
  }

  // The browser is told to fetch these exact versions, so the local copies must be the same
  // release - otherwise a CDN-blocked client silently renders a different build.
  assert.match(await read("tailwindcss-browser.js"), new RegExp(`"${TAILWIND_BROWSER_VERSION}"`));
  assert.match(await read(MERMAID_LOCAL_ASSET_FILE), new RegExp(`version:"${MERMAID_VERSION}"`));

  // Mermaid must stay the self-contained UMD bundle: the ESM build resolves ~150 sibling
  // chunk files that no artifact directory ever receives.
  assert.doesNotMatch(await read(MERMAID_LOCAL_ASSET_FILE), /from"\.\/chunks/);
});
