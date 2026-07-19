import { POLL_SEND_AND_END_RULE, POLL_WAKE_PATH_RULES, createHomeOutput } from "./cli.js";
import { DESIGN_CDN_SNIPPET, designLocalSnippet, mermaidLocalSnippet } from "./design-reference.js";
import { PLAYBOOK_ROUTER_HELP } from "./playbooks.js";

// Trigger string Claude Code (and other agents) match against to auto-load the skill.
// Kept terse and outcome-focused so it fires on "about to show something visual" intents.
export const SKILL_DESCRIPTION =
  "Turn complex or visual agent responses into rich, reviewable HTML artifacts the user can " +
  "annotate and send feedback on, using the ai-dev-axi CLI. Use when about to give a plan, " +
  "comparison, diagram, table, code diff, report, or anything easier to grasp visually than as prose.";

function bullets(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function playbookList(playbooks) {
  return playbooks.map((p) => `- \`${p.id}\` - ${p.use_when}`).join("\n");
}

// ai-dev-axi is not published to npm, so every command example installs straight from the
// repo. npm only reads a GitHub URL as a git source in the `git+https://...git` form; a bare
// https://github.com/... URL is treated as a remote tarball and fails to install.
export const INVOKE = "npx -y git+https://github.com/sanghyukp/html-axi.git";

function skillCommandText(text) {
  return text.replaceAll("`ai-dev-axi", `\`${INVOKE}`);
}

/**
 * Render the installable SKILL.md for the ai-dev skill. The body mirrors what
 * `ai-dev-axi` prints with no arguments (minus live session state), while the
 * frontmatter adds discovery metadata for Agent Skills and Hermes Agent.
 *
 * @returns {string} full SKILL.md contents including YAML frontmatter
 */
export function createSkillMarkdown() {
  const home = createHomeOutput({ bin: "ai-dev-axi", sessions: [], includeSessions: false, agent: "static" });

  return `---
name: ai-dev
description: ${SKILL_DESCRIPTION}
argument-hint: <what the artifact should show>
author: Kun Chen (kunchenguid)
metadata:
  hermes:
    tags: [html, review, artifacts, visualization]
    category: productivity
---

# AI-DEV Editor

${skillCommandText(home.description)}

ai-dev-axi is not on npm - install it straight from the repo with \`${INVOKE} <html-file>\`. No global install needed.
If ai-dev-axi output shows a follow-up command starting with \`ai-dev-axi\`, run it as \`${INVOKE} ...\` instead.
In restricted subprocess sandboxes, CI, or agent harnesses where \`npx -y\` exits opaquely (for example with status 216), use an already-installed copy directly: \`node "$(npm root)/ai-dev-axi/dist/cli.mjs" <html-file>\` for a local install, \`node "$(npm root -g)/ai-dev-axi/dist/cli.mjs" <html-file>\` for a global install, or the bare \`ai-dev-axi <html-file>\` bin after installing once.

## Request

$ARGUMENTS

If the request above is non-empty, the user invoked \`/ai-dev\` explicitly - build an HTML artifact for that request now, following the workflow below.
If it is empty, infer what to visualize from the conversation.

## When to use

${home.help[home.help.length - 1]}

## Workflow

1. Create the HTML artifact (default location \`.ai-dev/<name>.html\` in the working directory).
2. Run \`${INVOKE} <html-file>\` to open or resume a review session in the browser.
3. Run \`${INVOKE} poll <html-file>\` to long-poll for the user's annotations, queued prompts, and browser-proven severe layout failures returned as \`layout_warnings\`.
   On the first poll, prefer \`--agent-reply "<one-line summary of what you built and what to review first>"\` so the conversation panel opens with context.
   The poll stays silent until the user acts or the real browser proves meaningful content is inaccessible or unusable - leave it running, never kill it.
   Cosmetic, intentional, transient, tiny, and uncertain observations remain silent.
${POLL_WAKE_PATH_RULES.map((rule) => `   ${skillCommandText(rule)}`).join("\n")}
4. If poll returns \`layout_warnings\`, follow the returned \`next_step\`: repair the severe failure and re-check it before involving the human.
5. Apply human feedback, then poll again with \`--agent-reply "<message>"\` to reply in the browser and keep the loop going under the same foreground-or-verified-wake-path rule.
6. Run \`${INVOKE} end <html-file>\` when the review is finished.
7. ${POLL_SEND_AND_END_RULE} Deliver any remaining updates directly in this conversation.

## Visual guidance

${bullets(home.visual_guidance)}

## Design

Only after the priority order above lands on the AI-DEV fallback, paste this into \`<head>\`:

\`\`\`html
${DESIGN_CDN_SNIPPET}
\`\`\`

If the CDN is blocked or unreachable, run \`${INVOKE} design --local\` to copy the same assets next to
the artifact, then use relative paths instead - a reset CDN connection otherwise leaves the artifact
completely unstyled and the layout audit stays silent about it:

\`\`\`html
${designLocalSnippet()}
\`\`\`

\`design --local\` also copies a self-contained Mermaid bundle. With no network, diagrams need this
instead of the Mermaid CDN snippet - otherwise the page is styled but every diagram silently fails to render:

\`\`\`html
${mermaidLocalSnippet()}
\`\`\`

Run \`${INVOKE} design\` for the CDN Mermaid snippet, the layout safety CSS, and the DaisyUI component reference.

## Playbooks

Run \`${INVOKE} playbook <id>\` for focused, detailed guidance on any of these.
${PLAYBOOK_ROUTER_HELP}
For flows, architecture, state, or sequence diagrams, do not hand-build boxes-and-arrows from div/flexbox; open the diagram playbook and use the theme-aware Mermaid snippet from \`${INVOKE} design\` unless SVG is needed for richly annotated nodes.

${playbookList(home.playbooks)}

## Commands & rules

${bullets(home.help.map(skillCommandText))}
`;
}
