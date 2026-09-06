---
name: nbg-design
description: Use when creating presentations in a design system inspired by the brand image of the National Bank of Greece (NBG), HTML slides (with a built-in right-click menu for in-place text editing with a formatting toolbar, shape resize/move, editing of the parts of inline SVGs, an AI assistant panel, "Export to PDF" and "Save edited copy", plus a per-deck rebuild script that re-embeds newer versions of those editing tools), slide specifications, PDF exports of HTML decks (one page per slide, aesthetics preserved) — all on the bundled NBG-inspired presentation design system, templates, logos, photography, screenshots, and guardrails.
---

# NBG Design

This skill packages a presentation design system inspired by the brand image of the National Bank of Greece (NBG) as a self-contained skill so it can be used from any working directory. This file is the single source of the skill's behaviour, defaults, asset list and guardrails; there is no separate configuration file to read.

## First step when this skill is used

Resolve all paths below relative to this skill directory, the directory that contains this `SKILL.md` file. Do **not** assume the original project checkout exists or that the current shell working directory is the original project root.

Before generating final slide output, read these bundled resources:

1. `NBG-Design/NBG Design System.html` — visual design-system reference.
2. `NBG-Design/slide-templates.jsx` — reusable 1920×1080 slide templates and component patterns.
3. `NBG-Design/tweaks-panel.jsx` — bundled tweak/edit helper reference when inspecting template host behavior.

Use the bundled assets in `NBG-Design/assets/` and the bundled presentation screenshots in `NBG-Design/screenshots/` as visual references.

## Required user inputs

For each deck or slide request, require:

- presentation topic;
- target audience;
- desired slide count or depth.

Ask the user for missing required inputs instead of inventing them. Never guess the topic, the audience, the slide count, or whether the bundled design-system source files may be modified.

Approved defaults:

- If no deck language is specified, use English (`en`). The design system supports `en` (English), `gr` (Greek) and `bi` (bilingual); any other value must come from the user.
- If no final output format is specified, use HTML (`html`).
- The NBG logo is shown (`show_logo: true`) unless the user asks to hide it.

Supported output formats: `html` (default) and `pdf` (always exported from the finished HTML deck — see "PDF output"). **PowerPoint (.pptx) is out of scope**: this skill produces HTML presentations and their PDF export only. If PowerPoint is requested, say so plainly and deliver the HTML deck (and its PDF) instead — never improvise a conversion. A request for "a PDF", "PDF version", "print version", or "send as PDF" selects `pdf`.

Do not create any other fallback configuration values unless the user explicitly approves the exception.

The skill holds no credentials. API keys for the in-deck assistant (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `AZURE_OPENAI_API_KEY`, …) are the viewer's and live only in their browser; never write a key, token or endpoint secret into this skill, into a deck, or into a saved copy.

## Design-system reference

Facts about the bundled system (source: `NBG-Design/NBG Design System.html`):

| Item | Value |
| --- | --- |
| Brand | Inspired by the brand image of the National Bank of Greece (NBG); bundled reference *NBG Presentation Design System* v1.0 |
| Audience | Internal presentations |
| Format | 16:9, 1920×1080 artboard; distilled from a 205-slide master deck |
| Typography | Aptos for everything, with a system fallback when Aptos is absent; never swap the deck's font stack |
| Languages | `en`, `gr`, `bi` |
| Default accent | deep teal `#003841` |

Palette (the only colours a deck, and the in-deck formatting toolbar, may use):

| Token | Hex | Role |
| --- | --- | --- |
| deep teal | `#003841` | primary accent, dark panels, covers, section openers |
| teal | `#007B85` | secondary accent |
| bright cyan | `#00ADBF` | highlight accent |
| electric cyan | `#00CFE7` | highlight accent, sparingly |
| black | `#0A1416` | body text on light backgrounds |
| grey 1 | `#BEC1BE` | rules, muted surfaces (design-system `--grey-1`) |
| grey 2 | `#939793` | secondary text (design-system `--grey-2`) |
| cream | `#F5F8F6` | light page background |
| white | `#FFFFFF` | text on dark panels, cards on cream |

The in-deck formatting and shape toolbars offer the same palette (their *Grey* is `#5B6B6D`, a mid tone for secondary text) plus *Default* and *Transparent*.

Style principles: teal-led palette with quiet neutrals; large accent blocks on covers and section openers; content pages mostly monochromatic and calm; generous whitespace, clear hierarchy, restrained emphasis; NBG logo placement and brand tone preserved.

Slide templates (`NBG-Design/slide-templates.jsx`, exposed as `window.<Name>`):

| Template | Kind | Recommended use |
| --- | --- | --- |
| `Cover1` | cover | hero-image cover on a deep dark background |
| `Cover2` | cover | neutral cover with a large right-side image card |
| `Cover3` | cover | alternate cover treatment from the design system |
| `DividerImage` | divider | section opener with photography |
| `DividerDark` | divider | section opener on deep teal |
| `DividerBright` | divider | section opener on a bright accent |
| `ContentImageRight` | content | explanation with a photo panel on the right |
| `ContentTwoColumn` | content | comparison or two-part explanation |
| `ContentStat` | content | stat-led slide with a large figure |

## Photography catalogue

Every photo lives in `NBG-Design/assets/` as `<stem>.jpeg` with a ready-to-embed `<stem>.datauri.txt`, and is placed with the token `{{<STEM in upper case, '-' → '_'>}}` (e.g. `photo-network-2` → `{{PHOTO_NETWORK_2}}`). Pick by subject and orientation: landscape photos fit the divider image card, the content image-right column and full-bleed backgrounds; portrait photos fit the cover photo card (720 × 880 / 820 × 960). Never stretch a photo to the other orientation — crop with `object-fit: cover` / `background-size: cover` instead.

Lifestyle set (original, Greek everyday life, warm light):

| Stem | Orientation | Subject | Typical use |
| --- | --- | --- | --- |
| `photo-fields` | landscape | child running through a wheat field towards wind turbines | sustainability, growth, energy |
| `photo-heart` | landscape | hands forming a heart | people, care, community |
| `photo-parthenon` | landscape | the Parthenon | heritage, Greece, institution |
| `photo-skate` | landscape | skateboarder in the city | youth, momentum, agility |
| `photo-street` | portrait | Athens shopping street at golden hour | retail, customers, everyday banking |

Technology set (generated 2026-09, teal-and-cream palette, no text or logos; three variants per subject — `1`, `2`, `3` are alternative takes of the same brief, so use only one variant of a subject per deck unless the repetition is deliberate):

| Stem | Orientation | Subject | Typical use |
| --- | --- | --- | --- |
| `photo-datacenter-1` | landscape | dark server racks with teal status lights, warm-lit wall and plant on the left | infrastructure, cloud, resilience |
| `photo-datacenter-2` | landscape | bright white server room, racks receding to the right, warm ceiling light | infrastructure, quiet/clean tone |
| `photo-datacenter-3` | landscape | long rack corridor in one-point perspective with a bright end | infrastructure, scale, journey |
| `photo-team-analytics-1` | landscape | three colleagues at a large wall chart on the left, windows behind | data, analytics, collaboration |
| `photo-team-analytics-2` | landscape | three colleagues in front of a teal wall, display on the right, Athens hills through the window | data, teamwork, local context |
| `photo-team-analytics-3` | landscape | three colleagues pointing at a bright wall display on the left | data, review, decisions |
| `photo-network-1` | landscape | small teal glass nodes on thin lines, large empty cream area on the left | abstract cover/divider background, headline on the left |
| `photo-network-2` | landscape | large teal glass spheres close up on the right, soft curtain, empty left | abstract cover background, AI/network themes |
| `photo-network-3` | landscape | web of teal and cream glass nodes on a plaster wall, empty left third | abstract divider background, connectivity |
| `photo-chip-1` | landscape | microprocessor on a dark board seen from above-left, shallow focus | AI, compute, engineering |
| `photo-chip-2` | landscape | microprocessor centred on copper traces, warm tones | AI, hardware, precision |
| `photo-chip-3` | landscape | microprocessor on a board with a deeply blurred surround | AI, technology detail |
| `photo-athens-dusk-1` | portrait | glass office tower at blue hour, Acropolis far off, street light trails | cover photo card, city, future |
| `photo-athens-dusk-2` | portrait | office towers seen from above at dusk, streets and Acropolis beyond | cover photo card, urban banking |
| `photo-athens-dusk-3` | portrait | lit glass tower over the evening city, Acropolis in the distance | cover photo card, growth |
| `photo-security-1` | portrait | frosted-glass padlock on a dark teal stone, warm side light | security, trust, compliance |
| `photo-security-2` | portrait | frosted-glass padlock on a green-marble slab, cream ground | security, calm/premium tone |
| `photo-security-3` | portrait | frosted-glass padlock on a teal block, bright cream ground | security, clarity |
| `photo-developer-1` | landscape | engineer at a standing desk with two monitors, side profile, teal wall | engineering, delivery, software |
| `photo-developer-2` | landscape | engineer seated at a desk by a window, teal wall | engineering, focus |
| `photo-developer-3` | landscape | engineer at a standing desk, two monitors, warm wood and plant | engineering, modern workplace |

## Design-system rules

- Use the bundled NBG-inspired presentation design system; do not invent a parallel brand or visual system.
- Preserve the NBG 16:9 / 1920×1080 internal slide composition.
- Use the NBG teal-led palette, quiet neutrals, generous whitespace, clear hierarchy, and restrained emphasis.
- Use NBG logos and bundled photography from `NBG-Design/assets/`. The NBG logo must always be the bundled lockup image — never a text label, initials, a colored square/box, or any CSS/SVG re-creation. See "Logo rendering (MANDATORY)".
- Treat bundled screenshots as visual references, not as source code.
- Start decks with an NBG-style cover slide.
- Use divider slides for major sections.
- Use content slides for explanations, comparisons, statistics, and takeaways.
- Keep slide copy concise and use speaker-notes-style expansion where needed.
- Keep newsletter/email prototypes out of scope unless the user explicitly asks to reuse them.

## HTML output guardrails

For HTML slide or presentation output:

- Fit the complete 16:9 slide inside common browser viewports.
- Keep the internal design coordinate system compatible with the 1920×1080 NBG artboard while scaling the rendered slide down when needed.
- Use a viewport-fitting wrapper, explicit rendered width/height sizing, aspect-ratio constraint, CSS transform scaling, or equivalent robust approach.
- When scaling a fixed 1920×1080 artboard, do not rely on the unscaled transformed element's layout box for page height.
- Prevent unintended horizontal or vertical scrolling caused by the artboard itself.
- Verify fit at common desktop/laptop viewport sizes: 1366×768 and 1440×900 are required; 1920×1080 and 1280×720 are optional extras.
- When screenshot tooling is available, save screenshots under `test_scripts/screenshots/` in the active working project, or another user-selected output folder, with descriptive filenames that carry the slide name and the viewport (`<slide-name>-<width>x<height>.png`, which is what `scripts/screenshot-deck.mjs` writes), and visually inspect them before delivery. On a headless host with no browser (typical for SSH/Linux runs), the screenshot step cannot run — so the browser-free `scripts/verify-deck.mjs <deck>.html --strict` check is the mandatory minimum gate and must pass before delivery.

Recommended viewport-fit pattern:

- Wrap the fixed-size slide in a viewport-sized frame with `overflow: hidden`.
- Scale the 1920×1080 slide from the top-left origin by the smaller of `availableWidth / 1920` and `availableHeight / 1080`, then centre the scaled slide with translate offsets.
- Measure the real viewport (`visualViewport.width/height` when available, otherwise `innerWidth/innerHeight`) so browser chrome and dynamic viewport height never cause vertical overflow, or use a CSS equivalent that sets both width and height explicitly.
- Do not use CSS-only transform scaling that leaves the parent's layout height at the unscaled 1080 px.

Layout-collision authoring checks (before finalising any slide's CSS coordinates):

- Identify the bounding region of the header/title, each card row or grid, each callout, every decorative shape that approaches content, the footer/logo, and the page number.
- Confirm those regions have positive separation on the 1920×1080 artboard; card rows and bottom callouts must not intrude into each other's vertical or horizontal space.
- Decorative shapes may sit behind or near content only when they do not reduce readability, obscure text, or make card boundaries ambiguous.
- With absolute positioning, compute or visually confirm each row's top/bottom coordinates and height rather than relying on z-index or source order.
- If the safe zones cannot be preserved, revise the content model instead of squeezing elements together.
- Protect the slide artboard from unintended element overlap: cards, text blocks, decorative shapes, logos, footers, page numbers, and grouped rows/columns must not collide unless the overlap is an explicit, content-safe brand accent.
- Reserve non-overlapping layout zones for the title/header, main body, card grids/rows, bottom callouts, and footer/logo area. Keep at least 32px internal artboard spacing between adjacent content groups, and at least 72px clearance above footer/page-number elements unless the template defines a larger safe area.
- When content does not fit without overlap, reduce copy, resize or simplify components, change the grid/row structure, or split the content across additional slides. Do not hide overflow, stack opaque elements on top of content, or rely on z-index as a workaround for a crowded layout.
- Treat the current `agentic-engineering-nbg-executive-presentation.html` slides 2 and 3 overlap pattern as a regression example: independently positioned card/callout rows must be checked against each other before delivery.

## Image embedding (MANDATORY)

Delivered HTML must be **fully self-contained**: every image — the NBG logo **and** all photography — must be embedded inline as a base64 `data:` URI so the deck renders identically on any machine, when moved, emailed, or opened directly. This is the single most important output rule.

### Absolute prohibitions for delivered HTML

- **NEVER** reference any image by a file path of any kind. Specifically forbidden as an `<img src>` / `background-image` / `url(...)` value:
  - `file://...` URLs (e.g. `file:///home/<user>/.claude/plugins/.../assets/logo-knockout.png`) — these point at the generating machine's plugin cache and break everywhere else. **This is the most common cause of a missing logo and is never acceptable.**
  - Absolute filesystem paths (`/Users/...`, `/home/...`, `C:\...`).
  - Relative paths (`assets/...`, `./NBG-Design/...`, `../...`).
  - URLs to the skill directory, the plugin cache, or any local location.
- **NEVER** substitute the logo with text (e.g. a "National Bank of Greece" label), initials, a single letter, a colored square/rounded box, an emoji, or any hand-built CSS/SVG mark.

A deck that contains any `file://`, absolute, or relative image path, or any non-image logo placeholder, is **incorrect and must be fixed before delivery**.

### Required approach

1. For each image you place, read the matching pre-encoded data-URI file bundled next to the asset and paste its **entire contents** as the `src`. Every asset has a ready-to-use `<asset>.datauri.txt`:
   - Logos: `NBG-Design/assets/logo-primary.datauri.txt` (full-color, for **light** backgrounds), `logo-knockout.datauri.txt` (white, for **dark** backgrounds), `logo-small.datauri.txt` (compact, for footers/tight spaces).
   - Photography: `NBG-Design/assets/photo-fields.datauri.txt`, `photo-heart.datauri.txt`, `photo-parthenon.datauri.txt`, `photo-skate.datauri.txt`, `photo-street.datauri.txt`, plus the 21 technology photos `photo-<subject>-<1|2|3>.datauri.txt` listed in "Photography catalogue".
   - Each file already begins with the correct `data:image/png;base64,` or `data:image/jpeg;base64,` prefix — paste it verbatim, do not truncate or edit it.
   - Example: `<img src="data:image/png;base64,iVBORw0K..." alt="National Bank of Greece" style="height:56px;width:auto;display:block;" />`
2. To avoid repeating a large data URI, define each one **once** and reuse it. Valid reuse patterns: a CSS class with `background-image: url("data:...")` applied to sized elements (data URIs work in `background-image`), or — in React/Babel decks — a shared JS constant interpolated into each `src`. (Note: CSS `var()` cannot be used for an `<img src>` attribute, only for `background-image`.)
3. Choose the logo variant by background: primary on light, knockout on dark, small for footers/compact placements. Preserve native aspect ratio (set `height`, let `width:auto`); never stretch or distort.

### Deterministic embedding & verification (REQUIRED — especially headless / SSH / Linux)

Hand-pasting large base64 blobs is the step that most often fails in non-interactive runs (e.g. `claude -p` over SSH on a Linux host): the model "approximates" a photo with a gradient or substitutes a text/box logo, and — with no display to screenshot — the lapse ships. **Do not rely on hand-pasting.** Use the bundled scripts instead:

1. **Author the deck with placeholder tokens, not inline data URIs.** Put a token wherever an image goes: `{{LOGO_PRIMARY}}`, `{{LOGO_KNOCKOUT}}`, `{{LOGO_SMALL}}`, and `{{PHOTO_FIELDS}}`, `{{PHOTO_HEART}}`, `{{PHOTO_PARTHENON}}`, `{{PHOTO_SKATE}}`, `{{PHOTO_STREET}}`, or any technology photo token from "Photography catalogue" (`{{PHOTO_DATACENTER_1}}`, `{{PHOTO_NETWORK_2}}`, `{{PHOTO_SECURITY_3}}`, …). Define each token **once** (e.g. a CSS `background-image: url("{{PHOTO_STREET}}")` class) and reuse the class.
2. **Embed deterministically.** From any working directory:
   `node "<skill-root>/scripts/embed-assets.mjs" <deck>.html`
   The script resolves the bundled assets relative to itself (not the cwd), so it works on any machine. It replaces every token with the verbatim `data:` URI and fails loudly if an asset is missing.
3. **Add the in-deck right-click menu (standard for every delivered deck).**
   `node "<skill-root>/scripts/add-deck-menu.mjs" <deck>.html`
   Inlines one self-contained `<script id="nbg-deck-menu-script">` before the last `</body>` (idempotent; re-running upgrades an older menu, including the v1.4 PDF-only one). Viewers get *Edit text* (in-place editing, also by double-click), *Resize / move shape*, *Export to PDF*, *Save edited copy* and *Discard edits*. See "In-deck right-click menu". Skip only if the user explicitly declines the menu, and then verify with `--no-deck-menu`.
4. **Verify before delivery (browser-free — works headless).**
   `node "<skill-root>/scripts/verify-deck.mjs" <deck>.html --strict`
   It exits non-zero if any image is not a `data:` URI, if forbidden `file://`/absolute/relative paths remain, if tokens are unresolved, or (in `--strict`) if the deck is suspiciously small / photo-less, contains bare `NBG`/`NPG` text that may be a logo substitute, or lacks the right-click deck menu. **Never deliver a deck that fails this gate.**
5. **Write the deck's rebuild script (standard for every delivered deck).**
   `node "<skill-root>/scripts/write-rebuild-script.mjs" <deck>.html`
   Writes `<deck>.rebuild.mjs` next to the deck: a self-contained Node script the recipient runs after this skill is updated, so the deck receives the **new version of the editing tools** (the inlined menu / toolbars / structure panel / assistant / PDF-export block) without being regenerated — it replaces only the editor block, leaves the slides untouched, re-runs `verify-deck.mjs --strict` and re-exports the PDF. It records the deck and PDF names, the skill's `scripts/` directory, the embedded block and plugin versions and the block's configuration. Pass `--no-pdf` when the deck is delivered without a PDF, `--pdf <file>` when the PDF has another name. See "Rebuild script". Skip only together with the menu (a deck without the menu has nothing to rebuild).
6. **If the skill was moved to another machine**, confirm the **whole** skill folder travelled, including `NBG-Design/assets/` (the `*.datauri.txt` files) and `scripts/lib/`. If `embed-assets.mjs` reports a missing assets directory, that is the root cause — copy the full skill, not just `SKILL.md`.

7. **Optional visual check when a browser exists.** On a host with Chrome/Chromium/Edge, also capture screenshots:
   `node "<skill-root>/scripts/screenshot-deck.mjs" <deck>.html`
   It auto-detects a browser, navigates each slide (works for both hash-based and `showSlide`-based decks), and writes one PNG per slide at 1366×768 and 1440×900 into `test_scripts/screenshots/`. Then **read each PNG** and inspect for clipping, overflow, element overlap, missing logo/photos, and brand alignment. If no browser is found it exits cleanly (code 3) — on a headless host rely on the `verify-deck.mjs --strict` gate instead.

`<skill-root>` is the directory containing this `SKILL.md`. See `scripts/README.md`.

### Pre-delivery check

Before delivering HTML, verify: (a) every `<img>`/`background-image` value starts with `data:image/` — grep the file and confirm there are **zero** `file://`, absolute, or relative image paths; and (b) a real NBG lockup image (not a text/CSS placeholder) appears wherever a logo is expected. The fastest way to perform both checks is to run `scripts/verify-deck.mjs <deck>.html --strict` (above), which works even on a headless host with no browser.

## In-deck right-click menu (text editing & formatting, shape resizing, PDF export)

Every delivered HTML deck carries a self-contained right-click menu, inlined by `scripts/add-deck-menu.mjs` (NBG-inspired: white panel, teal accent rule, Aptos stack; Escape or a click outside closes it; right-clicking a link or form field keeps the browser's native menu; 📌 pins it — it then stays open, keeps its place, and can be dragged by its header; ⧉ detaches the whole menu, structure tabs included, into a window of its own. While the menu is detached, or open on a panel tab, a right-click on the slide opens a compact **picker** at the pointer instead: the same *Select at this point* hierarchy — front-most first, containers and shapes behind — plus *Edit text*; a click selects, Shift+click adds, Esc closes it). It adds ~150 KB and lives outside the slides, so it — and the selection frame and toolbars — never appears in the slide area of screenshots, in PDFs, or in the print layout.

- **Edit text** — offered when the right-click landed on text; **double-clicking any text on a slide does the same**. The element (the whole text block, so accent spans inside a title stay intact) becomes editable in place with a teal outline: typing, Backspace, Shift+Enter for a line break, Ctrl/Cmd+Z; **Enter or a click outside applies, Esc cancels**. Paste and drop insert plain text, and anything the browser wraps around typed text — other than the toolbar's own bold/italic/underline/strike tags — is unwrapped when the edit is applied. Deck keyboard shortcuts (arrows, space) are suppressed while editing.
- **One floating toolbar with three tabs** — **Text** (formatting), **Shape** (shape & arrange rows) and **SVG** (parts) share a single panel with one grip, one ⚓ and one ⧉ in a side strip; one tab's row shows at a time. The tab of the editor in use comes to the front on its own (text being edited or a selection of text blocks → Text; any other selection → Shape; an SVG in editing → SVG); a tab the viewer clicks stays in front until another editor takes over; a tab whose editor has nothing to work on is dimmed but opens (its row idle). A row's ✕ hides its tab; the menu's *Toolbars* section ticks the tabs, brings one to the front (pinned) or hides the one in front. The panel floats next to the selection and can be dragged anywhere by its grip. A dragged toolbar is **anchored**: it opens at that spot from then on (remembered per deck in the browser) and shows ⚓ next to its grip; click ⚓ (or double-click the grip) to release it, and it follows the selection again. ⧉ detaches the whole toolbar into a window of its own.
- **Formatting row** — shown while editing text or with text blocks selected. **Every control applies to the selected text when there is a selection, and to the whole text block when there is none.** **B / I / U / S** (a selected run gets a semantic `<b>`/`<i>`/`<u>`/`<s>` tag), **A− / A+** and an exact **px size**, **font family** (the design system's stacks: Aptos, Inter, Helvetica, Arial, Georgia, Times New Roman, Courier New, or Default), **text colour** (the NBG palette only: deep teal, teal, bright cyan, electric cyan, black, grey, cream, white, or Default) — on a selection these wrap exactly the selected run in a styled span; on the block they become inline style (the block's line-height is kept proportional when the design fixed it in px). **Alignment** is always block-level. **Clear** removes the selection's tags and spans, or returns the whole block to its authored style. **Done** applies. Shortcuts: Ctrl/Cmd+B/I/U, Ctrl/Cmd+Shift+> and < for size. Block-level formatting is recorded as a `style` edit; selection-level tags and spans travel with the text edit. Esc reverts both.
- **Resize / move shape** — offered for the card, photo panel, image, decorative block or text block under the pointer (the hint names it with its size). A double-click on a shape or an image (no text under the pointer) selects it the same way. A teal selection frame with eight handles appears: drag a handle to resize (Shift keeps the proportions), drag inside to move, arrow keys nudge by 1 px (Shift 10 px), Alt+arrows resize, Tab selects the enclosing shape, Esc/Enter/click outside finishes. Elements in normal flow get only the east/south/corner handles (they grow right and down). Only the element's inline geometry changes (`left/top/width/height`, plus `position:relative` for a moved flow element); pointer deltas are divided by the slide's current scale, so coordinates stay exact artboard pixels at any viewport size.
- **Shape toolbar** — appears with the selection frame and can be dragged by its grip: **X / Y / W / H** fields (artboard px; offsets for a flow element; the selection box when several shapes are selected), **fill** (NBG palette, transparent, or Default), **border** (none, 1–6 px, colour from the palette; a new border defaults to deep teal), **corner radius**, **opacity**, **shadow** (none, soft, strong, or Default), **Reset** (original size, position and style), **Done**. Everything is inline style on the element, recorded as the same `style` edit as its geometry. **Reset shape** in the menu does the same as the toolbar's Reset.
- **Several shapes at once** — text blocks, cards, panels and images alike. **Shift+click** adds the smallest shape under the pointer to the selection (a text block inside a card, not the card — as in the SVG editor; inside a selected shape it removes that shape instead), **Shift+drag** on the slide draws a selection box that adds every top-level shape fully inside it, **Ctrl/Cmd+A** (while a shape is selected) selects every top-level shape of the slide, **Ctrl/Cmd+click selects everything inside the shape under the pointer** (a card's cards, text blocks and images; a shape with nothing inside is picked alone, even a member of a group); the menu offers *Add to selection* / *Remove from selection* / *Select all shapes on this slide* too. A slide-filling background layer never counts as a shape for these (right-click it to select it explicitly). The frame spans the selection and each member gets a dashed mark: dragging inside moves all of them, the handles scale all of them proportionally, arrows nudge all, and every style control of the toolbar applies to all.
- **Edit SVG** — offered when the right-click landed on an inline `<svg>` (an icon, a diagram, a chart drawn in the deck); a double-click on the selected SVG, or a click on one of its parts in the Tree tab, does the same. The SVG gets a dashed outline and its **parts** — paths, rects, circles, ellipses, lines, polygons, text, images, `use` references and groups (nothing inside `<defs>`, clip paths, masks or symbols) — become selectable: a click picks the innermost part under the pointer (and starts moving it) — also through the frame of the selected part, so a group's members are one click away — **Shift+click adds a part to the selection** (through the frame as well; inside a selected part or group it removes that one), **Ctrl/Cmd+click selects what is inside the smallest part under the pointer** — the part a plain click would pick, so a leaf is picked alone; on the frame of a selected group (Tab selects it) it selects the group's members, Ctrl/Cmd+A or the toolbar's **All** selects every top-level part, Tab selects the enclosing group, Shift+Tab the first part inside, the toolbar's **Parts** list any of them in drawing order. The selection gets a frame with eight handles (several parts: one frame spanning them, a dashed mark per part): drag inside to move, a handle to resize (Shift keeps the proportions), arrows nudge by one SVG unit (Shift: ten), Alt+arrows resize — all of the selected parts together, keeping their places within the box. The **SVG row** of the floating toolbar shows X / Y / W / H in the SVG's own units, **fill** and **stroke** (the NBG palette, *None*, *Default*), **stroke width**, **opacity**, the **text** of a `<text>` part (one run; Enter applies), **Order** (front / forward / backward / back — the drawing order; Ctrl/Cmd+] and [), **Duplicate** (Ctrl/Cmd+D; the copies sit on the originals), **Delete**, **Reset SVG** (every part as designed) and **Done** — colours, width, opacity, order, Duplicate and Delete apply to every selected part; the text field needs one `<text>` part alone. Geometry is written in the part's parent coordinate system — `x` / `y` / `width` / `height` on a rect or image without a transform, `x` / `y`, `cx` / `cy` or `x1…y2` for a plain move of text, a `use`, a circle, an ellipse or a line, otherwise a `matrix()` prepended to the part's own transform — so path data is never rewritten; colours become presentation attributes (or the inline style property when the part already has one). Every change is one edit of the `<svg>` element, so it persists, lands in the saved copy, is discarded with the slide and prints. Esc deselects the part, then ends the session; Enter, *Done*, *Finish SVG editing* in the menu or a click outside the SVG end it too. The SVG as a whole is still a shape (*Resize / move shape* sizes and places it).
- **Nested and overlapping shapes** — a click can only land on one level (right-click picks the innermost boxed element, so a text block inside a card resolves to the card; Shift+click and the selection box pick the outermost). To reach any other level: the right-click menu's **Select at this point** section lists every shape stacked under the pointer, front-most first (nested parts, their containers, shapes behind — text blocks inside cards included; click selects it alone, Shift+click adds it); the shape toolbar's **Stack** list offers the enclosing shapes, the selected one and its child shapes; **Ctrl/Cmd+click** on a shape with nothing inside picks it, and again on the same spot selects the next shape out (wrapping round); **Tab** steps out to the enclosing shape and **Shift+Tab** back in (to the child under the last click).
- **Arrange row** (the shape toolbar's second row): **Order** — bring to front, bring forward, send backward, send to back (Ctrl/Cmd+] and [ step; with Shift to the front/back) — written as inline `z-index` computed from the siblings' effective stacking order (a flow element gets `position: relative`; when a negative index is needed the parent is made a stacking context with `isolation: isolate`); **Align** left / centre / right / top / middle / bottom and **Distribute** horizontally / vertically (equal gaps; three or more shapes when relative to the selection, two when across the slide) — relative to the selection's own box (the first and last stay put) or **to slide**, chosen in the small select; **Group** (Ctrl/Cmd+G) / **Ungroup** (Ctrl/Cmd+Shift+G) — a group is logical: its members carry `data-nbg-group="<id>"` (recorded as a `group` edit, so it persists, lands in the saved copy and is removed by *Discard edits*) and always select, move, resize, align and order together; the DOM is never restructured.
- **Detachable panels** — ⧉ in the header of the shape toolbar, the structure panel and the assistant moves that panel into a window of its own: in Chrome / Edge a Document Picture-in-Picture window (always on top, no browser chrome, movable anywhere on the desktop, even off the browser; closed with the deck), elsewhere a pop-up window. The panel keeps working on the deck from there; closing the window, or ✕ / Esc in the panel, brings it back. The text-formatting toolbar stays attached because it works on the deck window's live text selection. A detached panel is pinned: it idles rather than disappears when nothing is selected. Screenshots requested from a detached assistant use that window's permission; the picker then asks which tab to share.
- **The menu itself** — a 📌 in its header pins it: a pinned menu stays open after a choice or a click elsewhere (its ticks and hints follow the selection; Esc or *Cancel* closes it). The *Toolbars* section collapses with its ▾ / ▸ header (remembered per deck; collapsed, it names the toolbars shown). Hovering an item that concerns an element — the stacked shapes of *Select at this point*, the shape items, *Edit text* — outlines that element on the slide.
- **Structure — the menu's Outline and Tree tabs** — the right-click menu has four tabs: *Menu* (the actions), *Assistant* (below), *Outline* (the slide's shapes — cards, text blocks, images — nested by containment, with checkboxes to select several, All / None, a text filter, kind icons, sizes, group badges; click a name to select it alone, Shift+click adds, Ctrl/Cmd+click toggles) and *Tree* (the slide's HTML elements, synced both ways with the selection — click selects, Shift+click adds, double-click edits its text, hovering outlines it — with the selected element's editable source in the bottom half under a draggable splitter whose position is remembered per deck; Apply records the change like every other edit, scripts are stripped). A structure tab holds the menu open (a click on the deck does not close it) and the menu is then draggable by its header; the `</>` button on the shape toolbar and Ctrl/Cmd+Shift+O / H open the Outline / Tree tab directly. Right-clicking a row opens a small *Ask about …* popup for that element (request, Answer / Replace, prompt, attachments); it stays open until you close it (✕, Cancel, Esc), shows the status and the answer itself — Copy, Undo after a replacement, *Open in the assistant panel* — and never opens the assistant panel on its own.
- **Toolbars** — a collapsible *Toolbars* section in the right-click menu lists the toolbar's three tabs (Text formatting, Shape & arrange, SVG parts) with a tick showing which tabs are on the toolbar and which one is in front. Clicking a tab at the back brings it to the front and **pins** it: it stays on the toolbar and follows the selection, sitting idle with its controls dimmed when nothing applies; clicking the tab in front, or the row's own ✕, hides that tab until it is shown again; the menu entry reflects that. *Automatic toolbars* restores the default, where the tabs appear with the selection. The choice is remembered per deck in that browser.
- **Toolbars follow the selection** — the shape toolbar always shows the current selection's geometry and style; the text toolbar formats the text being edited or, when a text block is selected as a shape (no edit session), every selected text block at block level (B/I/U/S, size, family, palette colour, alignment, Clear back to the authored style; Ctrl/Cmd+B/I/U work there too); the structure panel follows the selection and the slide. When the deck moves to another slide, a selection that left the screen is dropped and the toolbars adapt.
- **The assistant** — the menu's *Assistant* tab (or Ctrl/Cmd+Shift+L while a shape is selected; there is no separate menu item — select the element first, then open the tab): the assistant lives inside the right-click menu, which stays open and resizable while the tab is shown and can be detached with ⧉ (it comes along). It has four views. **Ask**: a prompt picked from a drop-down (the built-in ones — *Free request*, *Review the slide*, *Proofread the text*, *Tighten the copy*, *Speaker notes*, *Restyle the selection*, *Rewrite the selection’s text* — plus the viewer's own), a request box for additional instructions, four **Attach** checkboxes — *Screenshot of the slide* (tab capture: the browser asks which tab to share, the current one is preferred; toolbars are hidden and the picture is cropped to the slide), *Slide source* (the slide's complete HTML plus the stylesheet rules it uses; embedded images and fonts are replaced by placeholders wherever they sit, and a request whose text would exceed 300 KB is refused with a per-attachment breakdown), *Selected element source*, *Clipboard image* (paste with Ctrl/Cmd+V into the request box, drop an image file on the panel, or *Read clipboard*; a thumbnail shows what is attached) — and a **Reply** choice: *Show the answer* (in the panel, with Copy and *Apply to selection*) or *Replace the selected element* (the reply must be the element's replacement HTML; it goes through the same path as the Code tab's Apply — same tag, scripts stripped, recorded as an edit — with an *Undo* button). Embedded images travel as `nbg-image:N` placeholders and are restored on apply. **Prompts**: the viewer's own prompts (short name, text, preferred reply mode) — add, edit, delete, copy a built-in one to edit it — stored in the browser. **Structure**: what a right-click on a row of the structure panel's Outline or Tree starts with — the prompt for *Answer me*, the prompt for *Replace this element*, the default attachments. The popup that opens on such a row shows the element, a request box, the *Answer me* / *Replace this element* choice (which switches the prompt), the prompt and the attachments; Send selects the element, opens the assistant and sends; the answer appears in the Ask view under a note of what was asked, or replaces the element with Undo. The Ask view's own choices are not changed. **Settings**: provider (Anthropic, Azure-hosted Anthropic on Microsoft Foundry, OpenAI-compatible, Azure OpenAI, DeepSeek), endpoint URL, model or deployment name, API key (remembered in the browser, or for the tab only), *Standard values* for providers with a fixed endpoint, *Test*. The panel remembers, per browser, where it was left and how big it was (double-click the grip to dock it again), the view it was on, the request text, the prompt, the attachment and reply choices, and every settings field as it is typed (Save only confirms). Settings are kept **per provider**: switching the provider swaps the endpoint, model, API version, key and key scope to what was last entered for that provider, so nothing is typed twice. Nothing is defaulted: a missing provider, URL, model or key blocks the request with a message. The key lives only in that browser's storage and is never written into the deck; the page calls the endpoint directly, so a provider that blocks browser calls needs a gateway that allows them.
- **Edits persist** in the browser's storage (keyed by the file) so a reload keeps them until they are saved or discarded. They live only in that browser: the file on disk is unchanged until the viewer saves a copy.
- **Save edited copy** — downloads `<name>-edited.html`: the edits applied to a pristine snapshot of the deck taken at load, so the copy loads exactly like the original, stays fully self-contained and carries the menu itself. **Discard changes on this slide** restores only the slide under the pointer (text, formatting, size, position, order and groups; the hint says how many changes it holds), **Discard edits** restores every slide.
- **Export to PDF** — see "PDF output → Export from the in-deck menu".

Rules for the agent:

- Run `add-deck-menu.mjs` after `embed-assets.mjs` and before `verify-deck.mjs --strict` (which requires the menu unless `--no-deck-menu` is passed because the user declined it). Re-running upgrades an older block.
- Then run `write-rebuild-script.mjs` so the deck is delivered with its `<deck>.rebuild.mjs` (see "Rebuild script"): the menu block is a snapshot of the editing tools at delivery time, and the rebuild script is how the recipient gets the newer tools into that deck later without regenerating it.
- The HTML panel's source editor (under the Tree tab) is the one deliberate exception to the brand guardrails below: a viewer who edits the source can set any colour, font or attribute. It exists at the user's explicit request (2026-09-03) for people who know what they are doing; it never brings in scripts, and every change stays a recorded, reversible edit. Do not point ordinary recipients to it.
- The menu edits **text, text formatting, geometry, stacking order, grouping, shape styling and the parts of inline SVGs only** (what a viewer can fix on the spot: a word, a bold run, a bigger title, a card that should be wider or teal, a photo panel nudged or rounded, a row of cards re-aligned or spread evenly, a badge brought in front of a photo, a bar of a drawn chart made taller or recoloured, an icon's stroke thickened, a label in a diagram reworded). Fonts are limited to the design system's stacks and colours to the NBG palette, so a viewer cannot leave the brand. Images, new elements and structure stay the skill's job; if the user wants those changed, regenerate the deck. Shape changes never re-flow neighbours: a viewer who widens one card in a row uses *Distribute* (or moves the next card) to restore the spacing, and the overlap rules of this skill still apply to the result. Ordering and grouping never restructure the DOM — they are inline `z-index` / `position` and a `data-nbg-group` attribute, so every element path stays valid.
- The assistant panel is the viewer's tool: the agent never enters endpoint URLs or API keys for a recipient, never bakes them into a deck, and does not rely on the panel for its own work (the agent authors decks with the skill itself). When a user asks how to use it, explain the Settings view (provider, URL, model, key) and that the key stays in their browser. Screenshots need a desktop Chromium browser (tab capture); a provider that rejects browser calls (CORS) needs a gateway.
- The CLI exporter prints the file on disk, not a viewer's unsaved edits. To deliver a PDF of an edited deck, export the saved `-edited.html` copy.
- When handing over a deck, tell the user in one line: double-click any text to edit it (Enter applies, Esc cancels); right-click for *Resize / move shape* (Shift+click or Shift+drag selects several; the toolbar orders, aligns, distributes and groups them), *Edit SVG* (the parts of a drawn icon, diagram or chart: move, resize, recolour, reorder, reword), the menu's *Assistant* tab (an AI request with the slide's screenshot / source, the selection and a clipboard image — the viewer enters their own endpoint and key), *Export to PDF* and *Save edited copy* — and that `node <deck>.rebuild.mjs` refreshes the deck's editing tools (and its PDF) after this skill is updated.

## Rebuild script (re-embedding newer editing tools)

Every delivered deck is three files: `<deck>.html`, `<deck>.pdf` and **`<deck>.rebuild.mjs`**, written by `scripts/write-rebuild-script.mjs` once the menu block is in the deck. The editing tools a deck carries (the inlined `nbg-deck-menu-script` block: menu, toolbars, structure panel, assistant, print layout) are a snapshot of the skill at delivery time; the skill keeps evolving, the file does not. The rebuild script is how a deck that was handed over months ago receives the current tools **without being regenerated**:

- `node <deck>.rebuild.mjs` — keeps a copy of the deck as it was (`<deck>.backup-<stamp>.html`; `--no-backup` skips it), replaces the editor block with the one the skill ships now — same `add-deck-menu.mjs` path, same configuration the deck was delivered with, the slides untouched byte for byte — runs `verify-deck.mjs --strict` and re-exports the PDF with `export-pdf.mjs` (the recorded `--selector` / `--size`, if any). Exit 0 = rebuilt, 1 = error or gate failed, 3 = HTML rebuilt but no browser on that host for the PDF (the same rule as the exporter: run it where Chrome/Chromium/Edge exists).
- `node <deck>.rebuild.mjs --check` — only reports the block version in the deck against the skill's (`RESULT: CURRENT`, exit 0, or `REBUILD NEEDED`, exit 1); writes nothing.
- `node <deck>.rebuild.mjs other.html` rebuilds another copy with the same settings — e.g. the `-edited.html` copy a viewer saved (its PDF lands next to it); `--no-pdf` / `--pdf <file>` control the export.
- **Where the skill's scripts are found** — `--scripts <dir>`, else `NBG_DESIGN_SCRIPTS`, else the directory recorded when the script was written (the skill's `scripts/` folder at that time). The directory must hold `add-deck-menu.mjs`, `verify-deck.mjs`, `export-pdf.mjs` and `lib/`; anything else is an error naming what was tried — the script never substitutes another location. Tell a recipient whose skill lives elsewhere to set `NBG_DESIGN_SCRIPTS` (or pass `--scripts`) to the installed plugin's `skills/nbg-design/scripts` directory.
- The script records, in plain JSON at its top: the deck and PDF file names relative to itself (the delivery folder can move as a whole), the scripts directory, the embedded block version, the plugin version (when the skill sits in its plugin checkout) and the block's configuration. It is generated per deck (`--pdf <file>`, `--no-pdf`, `--selector`, `--size`, `-o <script>` at generation time) and must be regenerated if the deck is regenerated.
- It does not apply to page-mode files made with the workspace's `html-editor` skill (a page has no slide PDF); the generator refuses those and points to `add-editor.mjs`.

## PDF output (export from the HTML deck)

A PDF deliverable is **always derived from the finished, verified HTML deck** — never authored separately, never re-laid-out for paper, and never assembled from screenshots. The bundled exporter prints the deck with the browser engine so the PDF is the deck: same 1920×1080 artboard per page, same palette, typography, spacing, logos and photography, with vector (selectable) text.

### Workflow

1. Build and verify the HTML deck exactly as for HTML output (author with tokens → `embed-assets.mjs` → `verify-deck.mjs --strict` → visual check). The PDF inherits every defect of the HTML, so the HTML gate is a precondition, not an option.
2. Export:
   `node "<skill-root>/scripts/export-pdf.mjs" <deck>.html [-o <deck>.pdf]`
   The script opens the deck in headless Chrome/Chromium/Edge (auto-detected; `--browser <path>` or `NBG_BROWSER` / `CHROME_BIN` to override), lifts the deck's navigation and viewport-scaling layer without touching any slide's own CSS, makes every top-level `.slide` visible in flow, settles fonts/images/animations, and prints one page per slide at the slide's own box (20 × 11.25 in for the 1920×1080 artboard, zero margins, backgrounds forced). It then verifies that the PDF page count equals the slide count and exits non-zero on any mismatch.
3. Inspect: rasterise a few pages (`pdftoppm -r 72 -png <deck>.pdf <prefix>` when poppler is available, otherwise open the PDF) and **read them** next to the browser screenshots. Cover, one divider, one dense content slide and the last slide are the minimum set. Anything that differs from the HTML render — a missing background, an animation stuck at its start state, a clipped card, a re-flowed line — is a defect to fix in the deck, then re-export.
4. Deliver the PDF together with the HTML it was exported from (unless the user explicitly wants only the PDF) and the deck's `<deck>.rebuild.mjs` (written after the menu, see "Rebuild script"; when the PDF has another name or place, generate the script with `--pdf <file>` so the rebuild refreshes that file), and report the exporter output line (slides / pages / page box).

### Export from the in-deck menu

Viewers of the HTML deck get the same export without any tooling: the in-deck menu's **Export to PDF** applies the very same print-layout code the CLI exporter uses (`scripts/lib/print-layout.js`, inlined), opens the browser's print dialog, and restores the interactive deck when the dialog closes. In the dialog the viewer picks **Save as PDF** (Chrome / Edge); paper size (1920×1080), zero margins and background printing are preset by the page, so the result is one page per slide, identical to the CLI export. Ctrl/Cmd+P and the browser's own Print command go through the same prepare/restore hooks. See "In-deck right-click menu". The agent-produced PDF deliverable is still made with `scripts/export-pdf.mjs` (deterministic, verified page count); the menu is for the people who receive the HTML.

### Rules

- **Aesthetics are frozen.** Do not add print stylesheets, change slide sizes, fonts, colours or copy "to make it print". If the exporter reports a slide box that differs from the page box, or more pages than slides, the deck's slide sizing/overflow is the bug — fix it in the HTML and re-export.
- **Do not fake it.** No `window.print()` at Letter/A4 size, no browser "Save as PDF" with headers/footers and margins, no office-suite round-trips, no stitched screenshots. Only `scripts/export-pdf.mjs` (or the identical DevTools `Page.printToPDF` settings it uses) produces a compliant PDF.
- **Every top-level slide must carry the `slide` class** (the exporter and the screenshot helper both key on it; use `--selector` only for a deck you did not author). Nested helper classes such as `slide-title` / `slide-footer` are fine.
- **Fonts come from the exporting host.** The PDF embeds exactly the faces the browser resolved for the deck's font stack (`Aptos` → system fallback when Aptos is absent), so PDF and screenshots always agree with each other. If the deliverable must show Aptos, export on a host where Aptos is installed; do not swap the font stack in the deck.
- **Headless host with no browser:** the exporter exits with code 3. Deliver the verified HTML, state plainly that the PDF could not be produced on this host, and give the one-line command to run where a browser exists. Never substitute a differently produced PDF.
- The exporter must never be used to print a deck that fails `verify-deck.mjs --strict`.
- What the exporter changes is only the host layer: navigation toggles (`.active` / `.hidden` / inline display / `[hidden]`) lifted, viewport-fit wrappers neutralised, non-slide chrome hidden, animations and transitions jumped to their end state, backgrounds forced with `print-color-adjust: exact`. It never changes a slide's own CSS, size, fonts, colours, copy, logos or photography; slides of a different size are reported, never resized. `--size WxH` overrides the page box only when the deck's slide box is wrong; `--settle <ms>` waits longer for fonts and images; `--debug-html <path>` dumps the printed DOM.
- Optional extra checks: `pdfinfo <deck>.pdf` (page count; 1440 × 810 pt pages for the 1920×1080 artboard) and `pdftotext` to confirm the text is selectable.

`<skill-root>` is the directory containing this `SKILL.md`. See `scripts/README.md` for the flags.

## Bundled files

Scripts (zero-dependency Node, see `scripts/README.md`):

- `scripts/embed-assets.mjs` — deterministic `{{TOKEN}}` → data-URI embedding.
- `scripts/verify-deck.mjs` — browser-free pre-delivery gate (mandatory, `--strict`).
- `scripts/screenshot-deck.mjs` — per-slide PNGs at the required viewports (needs a browser).
- `scripts/export-pdf.mjs` — HTML deck → PDF, one page per slide, aesthetics preserved (needs a browser).
- `scripts/add-deck-menu.mjs` — inlines the right-click deck menu (Edit text / Export to PDF / Save edited copy) into a deck (idempotent; `--remove` strips it).
- `scripts/write-rebuild-script.mjs` — writes the deck's `<deck>.rebuild.mjs`, delivered with the HTML and the PDF: re-embeds the skill's current editing tools into that deck, verifies it and re-exports its PDF (`--check` only reports).
- `scripts/lib/find-browser.mjs` — shared Chrome/Chromium/Edge locator.
- `scripts/lib/cdp.mjs` — shared DevTools-protocol client (launch, navigate, evaluate, print).
- `scripts/lib/print-layout.js` — the print-layout shim shared by the exporter and the in-deck menu (browser JS).
- `scripts/lib/deck-menu.js` — the in-deck menu: UI, in-place text editing, shape resize/move, SVG part editing, persistence, saved copy, print orchestration (browser JS, inlined by `add-deck-menu.mjs`; configurable through `window.nbgDeckMenuConfig` — root selector, page mode — so the same editor serves non-deck HTML, see `scripts/README.md` §5).

References (design history and the issue register; this `SKILL.md` is the authoritative behaviour):

- `references/project-design.md`
- `references/project-functions.MD`
- `references/configuration-guide.md`
- `references/issues-pending-items.md`
- `references/refined-request-user-level-nbg-design-skill.md` and `references/codebase-scan-user-level-nbg-design-skill.md` — the original request and scan the skill was built from.

Design-system files:

- `NBG-Design/NBG Design System.html`
- `NBG-Design/slide-templates.jsx`
- `NBG-Design/tweaks-panel.jsx`

Assets:

- `NBG-Design/assets/logo-primary.png` (+ `logo-primary.datauri.txt` — base64 data URI for HTML embedding)
- `NBG-Design/assets/logo-knockout.png` (+ `logo-knockout.datauri.txt` — base64 data URI for HTML embedding)
- `NBG-Design/assets/logo-small.png` (+ `logo-small.datauri.txt` — base64 data URI for HTML embedding)
- `NBG-Design/assets/photo-fields.jpeg` (+ `photo-fields.datauri.txt`)
- `NBG-Design/assets/photo-heart.jpeg` (+ `photo-heart.datauri.txt`)
- `NBG-Design/assets/photo-parthenon.jpeg` (+ `photo-parthenon.datauri.txt`)
- `NBG-Design/assets/photo-skate.jpeg` (+ `photo-skate.datauri.txt`)
- `NBG-Design/assets/photo-street.jpeg` (+ `photo-street.datauri.txt`)
- Technology photography, 21 files `NBG-Design/assets/photo-<subject>-<n>.jpeg` (+ `.datauri.txt` each), where `<subject>` is one of `datacenter`, `team-analytics`, `network`, `chip`, `athens-dusk`, `security`, `developer` and `<n>` is `1`, `2` or `3` — see "Photography catalogue".
- All `*.datauri.txt` files hold the ready-to-embed base64 data URI for the matching image (see "Image embedding (MANDATORY)").

Presentation screenshots:

- `NBG-Design/screenshots/01-editorial.png`
- `NBG-Design/screenshots/01b-editorial-prog.png`
- `NBG-Design/screenshots/01c-editorial-end.png`
- `NBG-Design/screenshots/02-bold.png`
- `NBG-Design/screenshots/03-report.png`
- `NBG-Design/screenshots/03b-report-mid.png`
- `NBG-Design/screenshots/03c-report-learn.png`
- `NBG-Design/screenshots/03d-report-end.png`

## Excluded by default

- **PowerPoint (.pptx) output and HTML-to-PowerPoint conversion** — out of scope for this skill, which covers HTML presentations and their PDF export only. When asked for PowerPoint, say it is not covered here and deliver the HTML deck and its PDF.

Do not use or expect these adjacent project artifacts unless the user explicitly requests them:

- newsletter/email prototype folders;
- `NBG-Design/nbg-gpt/`;
- `NBG-Design/newsletter/`;
- `NBG-Design/notebooklm/`;
- email/GPT/NotebookLM/training screenshots;
- generated presentation deliverables from the original project;
- test artifacts from the original project;
- secrets, credentials, tokens, virtual environments, caches, generated bytecode, or version-control metadata.

## Quality checklist

Before delivering NBG slide work:

- For HTML output, run `node "<skill-root>/scripts/verify-deck.mjs" <deck>.html --strict` and confirm it passes. This is mandatory and works on a headless host. Never report a deck complete while it fails. (Embed assets with `scripts/embed-assets.mjs` first; see "Deterministic embedding & verification".)
- For HTML output, confirm the right-click deck menu was added with `scripts/add-deck-menu.mjs` (the strict gate checks for it and warns when the block is older than the skill's) and tell the user how to use it (double-click to edit text; right-click for Resize / move shape, Edit SVG, Export to PDF, Save edited copy), unless the user declined it.
- For every deck with the menu, confirm `<deck>.rebuild.mjs` was written with `scripts/write-rebuild-script.mjs` after the menu (and after the PDF's name was settled: `--pdf` / `--no-pdf`), that `node <deck>.rebuild.mjs --check` reports `CURRENT`, and deliver it with the HTML and the PDF, telling the user it refreshes the deck's editing tools after a skill update.
- Confirm every slide has a clear purpose.
- Confirm colors match the bundled NBG palette.
- Confirm the language is consistent with the request or the approved English default.
- Confirm the output format is consistent with the request or the approved HTML default.
- Confirm NBG logo visibility and placement match the intended template.
- For HTML output, confirm the full slide fits the viewport without clipping or unintended scrolling.
- For HTML output, confirm rendered screenshots show no unintended overlaps among cards, text blocks, decorative shapes, logos, grouped rows/columns, footers, or page numbers.
- If any overlap is found during visual verification, revise the layout and repeat the screenshot inspection before delivery; do not report the deck as complete while a collision remains.
- For PDF output, confirm the source HTML passed `verify-deck.mjs --strict`, that `scripts/export-pdf.mjs` reported `RESULT: PASS` (pages = slides, page box = the slide box, normally 1920x1080), and that rasterised pages were read and match the browser render (backgrounds, photography, logo, typography, no clipping). Deliver the PDF with its source HTML.
- Report the files/resources inspected and any visual verification artifacts used.
