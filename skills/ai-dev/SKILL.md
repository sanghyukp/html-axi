---
name: ai-dev
description: Turn complex or visual agent responses into rich, reviewable HTML artifacts the user can annotate and send feedback on, using the ai-dev-axi CLI. Use when about to give a plan, comparison, diagram, table, code diff, report, or anything easier to grasp visually than as prose.
argument-hint: <what the artifact should show>
author: Kun Chen (kunchenguid)
metadata:
  hermes:
    tags: [html, review, artifacts, visualization]
    category: productivity
---

# AI-DEV Editor

AI-DEV Editor helps agents turn rich HTML artifacts into collaborative human review surfaces. Whenever you are about to give user a complex response that will be easier to understand via a rich / interactive page, consider using AI-DEV Editor. First generate an interactive HTML artifact according to user request, then run `npx -y git+https://github.com/sanghyukp/html-axi.git <html-file>` so the user can visually review it, annotate elements or selected text, queue prompts, and send feedback back through `npx -y git+https://github.com/sanghyukp/html-axi.git poll`.

ai-dev-axi is not on npm - install it straight from the repo with `npx -y git+https://github.com/sanghyukp/html-axi.git <html-file>`. No global install needed.
If ai-dev-axi output shows a follow-up command starting with `ai-dev-axi`, run it as `npx -y git+https://github.com/sanghyukp/html-axi.git ...` instead.
In restricted subprocess sandboxes, CI, or agent harnesses where `npx -y` exits opaquely (for example with status 216), use an already-installed copy directly: `node "$(npm root)/ai-dev-axi/dist/cli.mjs" <html-file>` for a local install, `node "$(npm root -g)/ai-dev-axi/dist/cli.mjs" <html-file>` for a global install, or the bare `ai-dev-axi <html-file>` bin after installing once.

## Request

$ARGUMENTS

If the request above is non-empty, the user invoked `/ai-dev` explicitly - build an HTML artifact for that request now, following the workflow below.
If it is empty, infer what to visualize from the conversation.

## When to use

Use ai-dev-axi when the user asks for a visual artifact, HTML explainer, interactive prototype, review surface, product or technical plan, comparison, report, or browser-based feedback loop

## Workflow

1. Create the HTML artifact (default location `.ai-dev/<name>.html` in the working directory).
2. Run `npx -y git+https://github.com/sanghyukp/html-axi.git <html-file>` to open or resume a review session in the browser.
3. Run `npx -y git+https://github.com/sanghyukp/html-axi.git poll <html-file>` to long-poll for the user's annotations, queued prompts, and browser-proven severe layout failures returned as `layout_warnings`.
   On the first poll, prefer `--agent-reply "<one-line summary of what you built and what to review first>"` so the conversation panel opens with context.
   The poll stays silent until the user acts or the real browser proves meaningful content is inaccessible or unusable - leave it running, never kill it.
   Cosmetic, intentional, transient, tiny, and uncertain observations remain silent.
   Keep the poll in the foreground by default and let it return the feedback directly to the agent.
   A background poll is allowed only through a harness-native tracked background-job facility whose completion result is guaranteed to resume or notify the same agent.
   Never use `nohup`, shell `&`, `disown`, redirected fire-and-forget processes, or a detached terminal without an explicit verified callback merely to keep polling alive.
   If the harness has no completion-aware background facility, use the foreground poll or first wire a verified wake callback into the surrounding supervisor.
   Do not tell the user the artifact is being monitored until that wake path is live.
   If the poll gets killed or times out anyway, just re-run it - queued feedback is never lost.
4. If poll returns `layout_warnings`, follow the returned `next_step`: repair the severe failure and re-check it before involving the human.
5. Apply human feedback, then poll again with `--agent-reply "<message>"` to reply in the browser and keep the loop going under the same foreground-or-verified-wake-path rule.
6. Run `npx -y git+https://github.com/sanghyukp/html-axi.git end <html-file>` when the review is finished.
7. `Send & End` ends the session. Its final feedback is still delivered once. After that response, polling stops, and the agent must not reopen the session uninvited. Deliver any remaining updates directly in this conversation.

## Visual guidance

- Use visual hierarchy to make the most important decisions, risks, tradeoffs, and next actions obvious at a glance
- Use visual structure such as sections, cards, tables, diagrams, annotated snippets, and side-by-side comparisons instead of long prose
- Choose typography, spacing, color, and layout deliberately so the artifact has a clear point of view
- Prevent horizontal overflow at every nesting level: nested grid/flex children also need minmax(0, 1fr) tracks and min-width: 0, especially when badges, labels, or status text use wide pixel or monospace fonts; wrap, truncate, or contain long unbreakable text deliberately
- When the artifact would describe existing or current UI or state, show it instead: capture screenshots of the real pages (run the app read-only if needed) and embed them, rather than explaining the current look in prose; reserve prose for what cannot be shown such as rationale, trade-offs, and open questions

## Design

Only after the priority order above lands on the AI-DEV fallback, paste this into `<head>`:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/daisyui@5.5.19/daisyui.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/daisyui@5.5.19/themes.css" />
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.2.4/dist/index.global.js"></script>
```

If the CDN is blocked or unreachable, run `npx -y git+https://github.com/sanghyukp/html-axi.git design --local` to copy the same assets next to
the artifact, then use relative paths instead - a reset CDN connection otherwise leaves the artifact
completely unstyled and the layout audit stays silent about it:

```html
<link rel="stylesheet" href="daisyui.css" />
<link rel="stylesheet" href="daisyui-themes.css" />
<script src="tailwindcss-browser.js"></script>
```

`design --local` also copies a self-contained Mermaid bundle. With no network, diagrams need this
instead of the Mermaid CDN snippet - otherwise the page is styled but every diagram silently fails to render:

```html
<script src="mermaid.js"></script>
<script type="module">
  const mermaid = window.mermaid;

  // Render Mermaid in a theme that matches the artifact page, and re-render when
  // the viewer flips the page theme - Mermaid never restyles an already-rendered
  // SVG on its own, so a fixed theme clashes in either light or dark mode.
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  // Normalize any CSS color the browser produces (rgb, oklch, hsl, named, ...)
  // to [r, g, b, a] bytes via a 1x1 canvas, so parsing never breaks on modern
  // color syntaxes like DaisyUI's oklch() values.
  const paint = document.createElement("canvas").getContext("2d");
  function toRgba(color) {
    paint.clearRect(0, 0, 1, 1);
    paint.fillStyle = "#000";
    paint.fillStyle = color;
    paint.fillRect(0, 0, 1, 1);
    return paint.getImageData(0, 0, 1, 1).data;
  }

  function compositeRgba(foreground, background) {
    const foregroundAlpha = foreground[3] / 255;
    const backgroundAlpha = background[3] / 255;
    const alpha = foregroundAlpha + backgroundAlpha * (1 - foregroundAlpha);
    if (alpha === 0) return [0, 0, 0, 0];
    return [
      (foreground[0] * foregroundAlpha + background[0] * backgroundAlpha * (1 - foregroundAlpha)) / alpha,
      (foreground[1] * foregroundAlpha + background[1] * backgroundAlpha * (1 - foregroundAlpha)) / alpha,
      (foreground[2] * foregroundAlpha + background[2] * backgroundAlpha * (1 - foregroundAlpha)) / alpha,
      alpha * 255,
    ];
  }

  function pageIsDark() {
    // Trust the actually-rendered page background so this works with any theming
    // mechanism: prefers-color-scheme, a data-theme attribute, or plain CSS.
    const root = document.documentElement;
    const rootBackground = toRgba(getComputedStyle(root).backgroundColor);
    const bodyBackground = document.body ? toRgba(getComputedStyle(document.body).backgroundColor) : [0, 0, 0, 0];
    const [r, g, b, a] = compositeRgba(bodyBackground, rootBackground);
    if (a > 0) {
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
    }
    const colorScheme = getComputedStyle(root).colorScheme;
    if (colorScheme.includes("dark") && !colorScheme.includes("light")) return true;
    if (colorScheme.includes("light") && !colorScheme.includes("dark")) return false;
    return darkQuery.matches;
  }

  const diagrams = [...document.querySelectorAll(".mermaid")].map((el) => ({ el, src: el.textContent }));
  let applied;
  let rendering = false;
  let queued = false;
  function queueRender() {
    queued = true;
    if (rendering) return;
    void render();
  }
  async function render() {
    rendering = true;
    try {
      while (queued) {
        queued = false;
        const theme = pageIsDark() ? "dark" : "default";
        if (theme === applied) continue;
        mermaid.initialize({ startOnLoad: false, theme, securityLevel: "strict" });
        for (const { el, src } of diagrams) {
          el.removeAttribute("data-processed");
          el.textContent = src;
        }
        try {
          await mermaid.run({ nodes: diagrams.map((d) => d.el) });
        } catch (error) {
          console.error("Mermaid diagram render failed:", error);
          return;
        }
        applied = theme;
      }
    } finally {
      rendering = false;
      if (queued) queueRender();
    }
  }

  // First render once stylesheets are applied (no wrong-theme flash), then keep
  // the diagrams in sync with page-theme toggles and OS light/dark changes.
  if (document.readyState === "complete") queueRender();
  else window.addEventListener("load", queueRender, { once: true });
  const themeObserver = new MutationObserver(queueRender);
  for (const el of [document.documentElement, document.body]) {
    if (!el) continue;
    themeObserver.observe(el, {
      attributes: true,
      attributeFilter: ["data-theme", "class", "style"],
    });
  }
  document.addEventListener("change", queueRender, true);
  document.addEventListener(
    "transitionend",
    ({ propertyName }) => {
      if (propertyName === "background-color") queueRender();
    },
    true,
  );
  darkQuery.addEventListener("change", queueRender);
</script>
```

Run `npx -y git+https://github.com/sanghyukp/html-axi.git design` for the CDN Mermaid snippet, the layout safety CSS, and the DaisyUI component reference.

## Playbooks

Run `npx -y git+https://github.com/sanghyukp/html-axi.git playbook <id>` for focused, detailed guidance on any of these.
One artifact often combines several playbooks (for example a plan that includes a comparison and a diagram), so MUST open each matching playbook before writing HTML.
For flows, architecture, state, or sequence diagrams, do not hand-build boxes-and-arrows from div/flexbox; open the diagram playbook and use the theme-aware Mermaid snippet from `npx -y git+https://github.com/sanghyukp/html-axi.git design` unless SVG is needed for richly annotated nodes.

- `diagram` - Map relationships, flows, state, and architecture
- `table` - Turn dense records into scan-friendly review surfaces
- `comparison` - Show options, tradeoffs, and current vs target behavior
- `plan` - Explain a product or technical plan before implementation
- `code` - Render source code, code files, patches, PR diffs, and before/after code inside AI-DEV artifacts
- `input` - Must be used when the agent needs to collect user input on decisions, choices, preferences, triage, scope, or other structured feedback from within the artifact
- `slides` - Create a deliberate presentation when slides are requested

## Commands & rules

- Run `npx -y git+https://github.com/sanghyukp/html-axi.git <html-file>` to open or resume an AI-DEV Editor session. If the user explicitly ended the session from the browser, this refuses to reopen it and explains why instead of reopening uninvited - pass `--reopen` only when the user asks for further review or something important needs their visual attention
- Unless the user specifies another location, create HTML artifacts in the current working directory under `.ai-dev/`
- AI-DEV serves the html file through a local express.js server. If your html needs to reference other filesystem assets such as images, CSS, fonts, and local scripts, copy them into the same directory as the HTML file, then reference them with relative paths from that directory. Never prepend `/` to those asset paths - root paths won't work
- Run `npx -y git+https://github.com/sanghyukp/html-axi.git poll <html-file>` to wait for user feedback or browser-proven severe layout failures. It long-polls and stays silent until the user sends feedback, ends the session, or the real browser proves meaningful content is inaccessible or unusable, so leave it running - never kill it. Repair and re-check every returned layout failure before involving the human; cosmetic, intentional, transient, tiny, and uncertain observations stay silent. Keep the poll in the foreground by default and let it return the feedback directly to the agent. A background poll is allowed only through a harness-native tracked background-job facility whose completion result is guaranteed to resume or notify the same agent. Never use `nohup`, shell `&`, `disown`, redirected fire-and-forget processes, or a detached terminal without an explicit verified callback merely to keep polling alive. If the harness has no completion-aware background facility, use the foreground poll or first wire a verified wake callback into the surrounding supervisor. Do not tell the user the artifact is being monitored until that wake path is live. If the poll gets killed or times out anyway, just re-run it - queued feedback is never lost. `Send & End` ends the session. Its final feedback is still delivered once. After that response, polling stops, and the agent must not reopen the session uninvited.
- Rendered Mermaid diagrams in `.mermaid` containers become embedded, editable Excalidraw whiteboards in the browser (click a diagram to unlock editing; a Fullscreen action opens it over the whole viewport) - flowchart, sequence, class, ER, and state diagrams convert to editable shapes; other types embed as an image to draw on. Scenes autosave locally; when a reload detects a changed Mermaid source, the reviewer explicitly chooses to re-convert and discard saved edits or keep editing the saved scene. Standalone and exported copies still render plain Mermaid. Queue feedback adds a prompt to the Conversation panel; when the user sends it, poll returns a tag "whiteboard" prompt carrying a bounded edit summary plus local scenePath (.excalidraw JSON) and previewPath (PNG) files - read the summary first, open the files only when needed, then apply the edits by updating the Mermaid source in the artifact (never try to write the scene back)
- Run `npx -y git+https://github.com/sanghyukp/html-axi.git end <html-file>` to end a session as the agent - ending it this way still allows a plain reopen later. When the user ends it from the browser instead, a later `npx -y git+https://github.com/sanghyukp/html-axi.git <html-file>` refuses to reopen it without `--reopen`
- Run `npx -y git+https://github.com/sanghyukp/html-axi.git export <html-file> [--out <path>]` to write a portable copy of the artifact - one HTML file with its LOCAL assets inlined - so it opens with no AI-DEV server and no sibling files. Remote CDN/font references are left as links, so it needs network to render those. Users can also export from the browser chrome's overflow menu
- Run `npx -y git+https://github.com/sanghyukp/html-axi.git share <html-file> [--password <pw>] [--token <t>]` to publish the artifact on ht-ml.app (https://ht-ml.app), a third-party hosting service not part of AI-DEV, and get back a visitable URL. Shares are PUBLIC by default, so anyone with the link can open them. Pass --password to publish a PRIVATE password-protected page; viewers must supply the password to view. Local assets are inlined; remote refs load over the network. It returns the url plus a secret update_key for managing the page later. Use --token or LAVISH_AXI_HTML_APP_TOKEN only when you have an optional bearer token; it is never required. Users can also publish from the browser chrome's overflow menu
- Run `npx -y git+https://github.com/sanghyukp/html-axi.git stop` to shut down the background server (it also self-stops when idle or after the last session ends with nothing connected)
- Run `npx -y git+https://github.com/sanghyukp/html-axi.git playbook <playbook_id>` for focused artifact guidance. One artifact often combines several playbooks (for example a plan that includes a comparison and a diagram), so MUST open each matching playbook before writing HTML.
- AI-DEV does not auto-inject any design system - artifacts stay portable so they render identically when opened directly without ai-dev-axi running. Before writing any HTML: Decide the design direction in this strict priority order, and only move to the next step when the current one truly yields nothing: (1) if the user asked for a specific look or named design system, use that; (2) otherwise you must first inspect the project the artifact is about - the subject or product whose content or UI it represents, which may differ from your current working directory - and match that project's design system: Tailwind or theme config, shared CSS variables or design tokens, component library, brand assets, or existing styled pages. If the artifact previews, proposes, or mocks a specific app's UI, render it in that app's own design system so it faithfully shows the product, even when you are running in a different repo; (3) only when both steps come up empty, use the AI-DEV-recommended Tailwind CSS browser runtime v4 + DaisyUI v5, available via CDN, and prefer that CDN snippet over hand-writing styles unless explicitly instructed otherwise by the user. Run `npx -y git+https://github.com/sanghyukp/html-axi.git design` for a content-to-playbook router, a copy-pasteable CDN snippet, a Mermaid CDN snippet/init for diagrams, and the DaisyUI component reference. When you deliver the artifact, state which of the three design sources you used and why.
- Use ai-dev-axi when the user asks for a visual artifact, HTML explainer, interactive prototype, review surface, product or technical plan, comparison, report, or browser-based feedback loop
