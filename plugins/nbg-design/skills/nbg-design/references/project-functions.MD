# Project Functions

> **Superseded (2026-09-05).** The context file `config/pi-agent-nbg-design.yaml` this document describes was folded into `SKILL.md` and removed; every rule, default, palette token, template and asset path it held now lives there. The text below is kept as design history.

## Pi Agent NBG Presentation Configuration

### Function
Provide a reusable YAML context/config bundle that Pi Agent can read before creating presentation content or slide specifications using the local NBG-inspired design system.

### Configuration File
- `config/pi-agent-nbg-design.yaml`

### Functional Requirements
- Reference the local `NBG-Design/` folder as the presentation design-system source.
- Reference the primary design-system host page, slide templates, assets, master deck, and presentation screenshots.
- Encode NBG presentation style principles, color tokens, supported languages, and template catalog.
- Instruct Pi Agent to inspect the design-system files before generating slides.
- Exclude newsletter/email prototypes by default.
- Avoid hardcoded secrets or provider credentials.
- Avoid machine-specific project-root paths in shared runtime/setup configuration.
- Treat paths inside `config/pi-agent-nbg-design.yaml` as repository-root-relative.
- Require Pi commands that use relative `@config/...` file inclusion to run from the repository root.
- Validate required repository files before use on a new machine.
- Use explicit local browser executable paths only when screenshot automation is performed; do not rely on a committed browser fallback path.
- Require user clarification for missing deck-specific inputs instead of using fallbacks.

### How to Use
Run from the repository root because Pi resolves relative `@file` paths against the shell current working directory.

```bash
cd /path/to/nbg-theme-agent
pi @config/pi-agent-nbg-design.yaml "Create a presentation about <topic> using the NBG-inspired design system."
```

For one-shot outline/spec generation:

```bash
cd /path/to/nbg-theme-agent
pi -p @config/pi-agent-nbg-design.yaml "Create a presentation outline about <topic> using the NBG-inspired design system."
```

Notes:
- All paths in `config/pi-agent-nbg-design.yaml` are repository-root-relative.
- Pi includes the YAML as context text; it does not automatically read nested YAML paths.
- Follow `docs/design/configuration-guide.md` when moving the project to another machine or checkout location.

## Sofia Voice Agent Automation Presentation Page

### Function
Provide a single Greek NBG-inspired HTML presentation page that summarizes the top automation opportunity areas for Sofia's Voice Agent using the supplied top-10 call-category data.

### Presentation File
- `presentations/sofia-voice-agent-automation-areas.html`

### Functional Requirements
- Present the automation topic in Greek and explicitly mention Sofia's Voice Agent.
- Use a single 16:9 / 1920×1080 presentation page.
- Represent the supplied total of 13,090 top-10 calls accurately.
- Highlight card-related calls as the dominant automation opportunity: 10,116 calls / 77.3%.
- Show grouped opportunity areas for cards, digital banking, and account/restriction inquiries.
- Recommend a first automation wave focused on card lifecycle and Smart PIN/reset PIN, which together represent 7,053 calls / 53.9% of the top-10 volume.
- Preserve NBG presentation styling through the local logo, teal-led palette, calm content layout, and executive-friendly copy.
- Fit the complete slide within browser viewport boundaries while preserving the internal 1920×1080 / 16:9 composition.
- Keep NBG design-system source files unchanged.

## Voice Agent Call Categories Opportunity Slide

### Function
Provide a single English NBG-inspired executive slide that communicates the voice-agent serviceable opportunity from 25,000 daily calls and the staged 2026 / Q1 2027 adoption target.

### Presentation Files
- HTML source of truth: `presentations/voice-agent-call-categories-slide.html`

### Functional Requirements
- Present the baseline of 25,000 total inbound calls per day.
- Show that 50% of total daily calls are classified into major categories, approximately 12,500 calls/day.
- Preserve the provided classified category distribution: 27%, 27%, 14%, 8%, 6%, 5%, 5%, 4%, and 4%.
- Explain that 60% of the classified subset is estimated to be voice-agent serviceable, approximately 7,500 calls/day or 30% of total daily call volume.
- Show the rollout target of 15% of total daily volume in 2026 and another 15% in Q1 2027.
- Keep final slide copy in English.
- Use the NBG 16:9 / 1920×1080 presentation design style with NBG logo and teal-led palette.
- Fit the HTML slide completely inside common browser viewports without unintended scrolling or clipping.
- Transparently handle the source ambiguity that says “10 categories” but lists 9 category rows by avoiding a misleading category count and adding a source note.

## HTML Presentation Overlap-Protection Guardrail

### Function
Define reusable configuration and skill rules that prevent generated NBG HTML presentation slides from containing unintended internal collisions between content elements.

### Configuration Files
- `SKILL.md`
- `config/pi-agent-nbg-design.yaml`

### Functional Requirements
- Preserve the 1920×1080 / 16:9 NBG artboard while reserving distinct zones for header/title, body content, card grids/rows, bottom callouts, footer/logo, and page-number elements.
- Prevent unintended overlaps between cards, text blocks, decorative shapes, logos, footer elements, page numbers, and grouped rows/columns.
- Allow overlap only when it is an explicit content-safe brand accent that does not obscure, crowd, or reduce readability of primary content.
- Keep at least 32px spacing between adjacent content groups and at least 72px footer clearance unless the bundled template defines a larger safe area.
- When using absolute positioning, check bounding boxes for independently positioned rows/callouts and ensure they have positive separation on the artboard.
- If content cannot fit safely, reduce copy, simplify or resize components, change the grid structure, or split material across additional slides.
- Do not solve overlap by hiding overflow, stacking opaque elements over content, or relying on z-index/source order to mask crowded composition.
- Require screenshot inspection at 1366×768 and 1440×900 to check for card-to-card, callout-to-card, shape-to-content, logo/footer-to-content, and page-number collisions.
- Treat any unintended overlap found during verification as a blocking defect requiring revision and repeated screenshot validation before delivery.
- Use `agentic-engineering-nbg-executive-presentation.html` slides 2 and 3 as regression examples of collisions to prevent.

## HTML Presentation Viewport-Fit Guardrail

### Function
Define reusable configuration rules that prevent generated HTML presentation pages from exceeding browser screen boundaries.

### Configuration File
- `config/pi-agent-nbg-design.yaml`

### Functional Requirements
- Preserve NBG's 1920×1080 / 16:9 slide composition for generated HTML presentation output.
- Render the complete slide inside the available browser viewport on common desktop and laptop screens.
- Use a viewport-fitting wrapper, aspect-ratio constraint, fixed-artboard scaling, or equivalent robust implementation.
- When fixed-artboard scaling uses CSS transforms, ensure the wrapper/frame height reflects the scaled slide or actual viewport height, not the unscaled 1080px artboard box.
- Prevent unintended horizontal or vertical overflow caused by the slide artboard itself.
- Verify future HTML outputs against common viewport sizes, including 1366×768 and 1440×900.
- Render screenshots for generated HTML slides at the required viewport sizes and visually inspect the actual screenshots before delivery.
- Store visual verification screenshots under `test_scripts/screenshots/` with filenames that include the slide name and viewport size.
- Repeat revisions and screenshot checks if any clipping, hidden bottom content, overflow, broken assets, or readability/design issues are visible.

## HTML Deck PDF Export

### Function
Export a finished, verified NBG HTML deck to a PDF that preserves its aesthetics: one page per slide at the slide's own box (the 1920×1080 artboard = 20 × 11.25 in), zero margins, backgrounds and embedded images preserved, vector (selectable) text.

### Script
- `scripts/export-pdf.mjs` (zero-dependency Node ≥ 18; drives headless Chrome/Chromium/Edge over the DevTools pipe)
- `scripts/lib/find-browser.mjs` (browser locator shared with `scripts/screenshot-deck.mjs`)

### Functional Requirements
- Accept `pdf` as an output format next to `html` (default); PowerPoint is out of scope; a PDF is always produced from the HTML deck, never authored separately.
- Require the HTML gate first: `embed-assets.mjs`, `verify-deck.mjs --strict`, and the screenshot inspection; never export a deck that fails the gate.
- Lift only the deck's host layer (navigation toggles `.active` / `.hidden` / inline `display` / `[hidden]`, viewport-fit wrappers, non-slide chrome); never change a slide's own CSS, size, fonts, colours, copy, logos or photography.
- Jump CSS animations/transitions to their end state, force `print-color-adjust: exact`, and wait for fonts and images before printing.
- Print with `Page.printToPDF` (`printBackground`, `preferCSSPageSize`, `scale 1`, page size = the measured box of slide 1; `--size WxH` only overrides a wrong slide box).
- Verify that the PDF page count equals the slide count and that every slide box equals the page box; exit 1 otherwise (the PDF is still written for diagnosis). A mismatch is a slide sizing/overflow defect to fix in the HTML.
- Exit 3 when no browser exists on the host; the agent then delivers the HTML and the one-line export command for a host with a browser.
- After a PASS, rasterise a few pages (`pdftoppm`) and read them next to the browser screenshots (cover, a divider, a dense content slide, the last slide at minimum) before delivery.
- Deliver the PDF together with its source HTML unless the user wants only the PDF; report the exporter's slides / pages / page-box line.

### How to Use
```bash
node "<skill-root>/scripts/export-pdf.mjs" my-deck.html            # writes my-deck.pdf next to the deck
node "<skill-root>/scripts/export-pdf.mjs" my-deck.html -o out/my-deck.pdf --browser "/path/to/chrome"
pdftoppm -r 72 -png my-deck.pdf pages/my-deck && pdfinfo my-deck.pdf
```

## In-Deck Right-Click Menu (Text Editing & Formatting, Shape Resizing & Arranging, PDF Export, Saved Copy)

### Function
Let anyone who receives the HTML deck (a) edit any text on a slide in place — double-click it or right-click → *Edit text* — (b) resize, move, style, order, align, distribute and group any card, photo panel, image, decorative block or text block, one at a time or several at once — right-click → *Resize / move shape*, Shift+click / Shift+drag / Ctrl+A to select more — keep the changes across reloads and download the deck with them applied, and (c) export the deck to PDF from the browser — right-click → *Export to PDF* → *Save as PDF* — with the same one-page-per-slide, aesthetics-preserved result as `scripts/export-pdf.mjs`. No tooling installed.

### Script
- `scripts/add-deck-menu.mjs` — inlines the menu (idempotent; upgrades the v1.4 PDF-only block; `--remove` strips it)
- `scripts/lib/print-layout.js` — print-layout shim shared with the CLI exporter (prepare + restore)
- `scripts/lib/deck-menu.js` — the menu UI, in-place editing, persistence, saved copy, print orchestration

### Functional Requirements
- Add the menu to every delivered HTML deck after `embed-assets.mjs` and before `verify-deck.mjs --strict`; the strict gate requires it unless the user declined it (`--no-deck-menu`) and warns on the older PDF-only block.
- Keep the deck fully self-contained: one inline `<script id="nbg-deck-menu-script" data-nbg-deck-menu="<version>">`, no external references; re-running upgrades an older block.
- Right-click (except on links/form fields) shows an NBG-inspired menu: *Edit text* when the click landed on text, *Export to PDF*, and — once edits exist — *Save edited copy* and *Discard edits*, plus *Cancel*; Escape or a click outside closes it; deck keyboard shortcuts stay suppressed while it is open.
- Text editing: double-click any text on a slide or use *Edit text*; the whole text block (inline accent spans intact) becomes `contenteditable` with a teal outline; Enter or a click outside applies, Esc cancels, Shift+Enter inserts a line break, Ctrl/Cmd+Z undoes; formatting shortcuts are blocked, paste/drop insert plain text, and every element the browser wraps around typed text (other than `<br>`) is unwrapped on commit; the element's CSS, `white-space` and box do not change while editing; deck shortcuts are suppressed.
- Formatting toolbar while editing (draggable by its grip): every control applies to the selected text when there is a selection and to the whole block otherwise — Bold / Italic / Underline / Strikethrough (semantic tags on a run; un-bold spans kept), A− / A+ and an exact px size, font family limited to the design system's stacks, text colour limited to the NBG palette (on a run: exactly the selected text wrapped in a styled span; on the block: inline style with line-height kept proportional when fixed in px), alignment (block), Clear (selection: tags and spans removed; block: back to the authored inline style), Done; shortcuts Ctrl/Cmd+B/I/U and Ctrl/Cmd+Shift+> / <; block formatting is recorded as a `style` edit, selection spans travel with the text edit, Esc restores both.
- Shape toolbar while a shape is selected (draggable by its grip): X / Y / W / H fields, fill (NBG palette, transparent, Default), border (none, 1–6 px, palette colour), corner radius, opacity, shadow (none, soft, strong, Default), Reset, Done — all inline style on the element, recorded in its `style` edit.
- Multi-selection: Shift+click adds the smallest shape under the pointer (as in the SVG editor) or removes it when it is selected, Shift+drag draws a selection box (top-level shapes fully inside; slide-filling backdrops excluded), Ctrl/Cmd+A selects every top-level shape of the slide, Ctrl/Cmd+click selects everything inside the shape under the pointer (its child shapes; a shape with nothing inside is picked alone); the menu offers *Add to selection* / *Remove from selection* / *Select all shapes on this slide*; the frame spans the selection with a dashed mark per member; moving, scaling (proportional), nudging, styling and Reset apply to every member; modifier gestures never reach the deck's own click handlers.
- Stack picker for nested / overlapping shapes: the menu lists every shape under the pointer (*Select at this point*, front-most first, text blocks inside cards included; click selects alone, Shift+click adds), the toolbar's Stack list offers enclosing shapes / the selected one / its child shapes, Ctrl/Cmd+click on a shape with nothing inside cycles outward at the same spot, Tab / Shift+Tab step out / in.
- Arrange (second toolbar row): Order — bring to front / forward / backward / send to back (Ctrl/Cmd+] / [ with Shift for front/back; also in the menu) as inline `z-index` derived from the siblings' effective stacking order, a flow element positioned relatively, the parent isolated when a negative index is needed, never DOM re-ordering; Align left / centre / right / top / middle / bottom and Distribute horizontally / vertically with equal gaps, relative to the selection's box (first and last fixed; distribute needs three) or to the slide (two or more); Group (Ctrl/Cmd+G) / Ungroup (Ctrl/Cmd+Shift+G) as logical groups (`data-nbg-group`, a `group` edit record) that always select and move together.
- SVG part editing (block v12): *Edit SVG* on an inline `<svg>` (menu; double-click on the selected SVG; a part row in the Tree) starts a session — parts (path, rect, circle, ellipse, line, polyline, polygon, text, image, use, g; nothing inside defs / clipPath / mask / symbol / pattern / marker / gradients / filter) picked by a click (innermost, the drag starts at once; through the frame too), Shift+click (adds / removes — several parts, a group and its member never together), Ctrl/Cmd+click (what is inside the smallest part under the pointer: a leaf alone, the members of a selected group when its frame is clicked), Ctrl/Cmd+A or All (every top-level part), Tab (enclosing group), Shift+Tab (first inner part) or the Parts list; a frame with eight handles (one frame spanning several parts, a dashed mark each) moves / resizes the selection (Shift keeps proportions), arrows nudge by one SVG unit (Shift ten, Alt resizes) — every selected part together; the toolbar's SVG row: X / Y / W / H in SVG units, fill and stroke (NBG palette, none, default), stroke width, opacity, the text of a one-run `<text>`, order (front / forward / backward / back, Ctrl/Cmd+] / [), Duplicate (Ctrl/Cmd+D, no ids), Delete, Reset SVG, Done. Geometry in the parent's user space (`getScreenCTM`): plain x / y / width / height on a rect or image without transform, x / y, cx / cy, x1…y2 on a pure move of text / use / circle / ellipse / line, else a `matrix()` prepended to the part's transform — path data never rewritten; colours as presentation attributes or the existing inline style property. One `html` edit record of the `<svg>` per SVG; Esc deselects then ends, Enter / Done / a click outside end; sessions exclusive with text editing, shape selection, source apply, discard and print.
- Shape resizing / moving: a selection frame with eight handles (three for flow elements) on the element under the pointer; handle drags resize (Shift keeps proportions), dragging inside moves, arrows nudge (Shift 10 px), Alt+arrows resize, Tab selects the enclosing shape, Esc/Enter/click outside finishes; pointer deltas are divided by the slide's current scale; only inline geometry changes, the top-left corner is pinned before a resize, flow elements move with `position: relative`; *Reset shape* restores one element; the frame is hidden in the print layout.
- One floating toolbar with three tabs (block v12): Text (formatting), Shape (shape & arrange rows), SVG (parts); one row at a time; the tab of the editor in use comes to the front (text editing or a selection of text blocks → Text, any other selection → Shape, an SVG session → SVG), a clicked tab stays until another editor takes over, a tab with nothing to work on is dimmed but opens its idle row. Toolbars menu section: ticks the tabs and marks the one in front; a tab at the back = pin it and bring it to the front, the tab in front or the row's ✕ = hide it until shown again, *Automatic toolbars* = the default; remembered per deck. Every toolbar adapts to the selection and the slide: the text toolbar formats the text being edited or every selected text block at block level, the shape toolbar the selection's geometry and style, the structure panel the selection and the slide; a slide change drops an off-screen selection.
- Detachable panels: ⧉ moves the shape toolbar, the structure panel or the assistant into a window of its own (Document Picture-in-Picture in Chrome / Edge — always on top, movable anywhere; a pop-up elsewhere); the panel keeps acting on the deck; closing the window, ✕ or Esc brings it back; a detached panel is pinned (idle when nothing applies). The text toolbar is not detachable.
- The menu: a pin keeps it open after a choice or a click elsewhere (ticks and hints follow the selection; Esc / Cancel close it); the Toolbars section collapses (remembered per deck); hovering an item about an element outlines that element on the slide; one *Show structure & HTML* item opens the panel.
- Structure / HTML panel (*Show structure & HTML*, toolbar `</>`, Ctrl/Cmd+Shift+O / H): an outline of the slide's shapes (cards, text blocks, images, nested by containment) with a checkbox per row for selecting several, readable labels, All / None, a filter, and the selection highlighted on the slide and in the list (a container and its content are never selected together); a tree of the slide synced with the visual selection both ways (select on the slide → row highlighted and revealed; click a row → that exact element selected, Shift+click adds, double-click edits text, hover outlines, keyboard navigation; edited elements marked) and an editable source view of the selected element — Apply keeps the element type, strips scripts / event handlers / `javascript:` URLs, records style / group / html / attrs edits. Deliberate exception to the brand guardrails, at the user's request.
- AI assistant panel (the menu's *Assistant* tab, Ctrl/Cmd+Shift+L — the *Ask the assistant* menu item was removed in block v12, the tab is the one entry): a request to an LLM with, each behind a checkbox, a screenshot of the current slide (tab capture, current tab preferred, our UI hidden, cropped to the slide), the slide's full HTML source with the stylesheet rules it uses (data URIs stripped in HTML and CSS alike; text above 300 KB refused with a breakdown), the selected element's source, and an image from the clipboard (paste into the request box, drop a file, or *Read clipboard*; thumbnail shown); a prompt from a drop-down — built-in (*Free request*, *Review the slide*, *Proofread the text*, *Tighten the copy*, *Speaker notes*, *Restyle the selection*, *Rewrite the selection's text*) and the viewer's own (short name, text, preferred reply mode; add / edit / delete / copy a built-in; stored in the browser) — plus free additional instructions; the reply shown in the panel (Copy, Apply to selection) or applied as the replacement of the selected element (same path as the Code tab's Apply: one root of the same tag, scripts stripped, recorded; Undo). Embedded images travel as `nbg-image:N` placeholders and are restored on apply.
- Assistant providers and settings: Anthropic (`<url>/v1/messages`, `x-api-key`, `anthropic-version`, `anthropic-dangerous-direct-browser-access`), Azure-hosted Anthropic / Microsoft Foundry (`https://<resource>.services.ai.azure.com/anthropic` + `/v1/messages`, `api-key`, deployment name as model), OpenAI-compatible (`<url>/chat/completions`, Bearer), Azure OpenAI (`<resource>/openai/v1/chat/completions` with `api-key`, or the deployments route when an API version is given), DeepSeek (`https://api.deepseek.com/chat/completions`, Bearer, `deepseek-v4-flash-vision-exp` for images). Endpoint, model, API key and the provider choice are entered by the viewer and kept in that browser's storage only (the key in `localStorage` or, for the tab only, `sessionStorage`; never in the deck). No fallbacks: a missing provider, URL, model or key blocks the request with a message. The panel remembers per browser its position and size (the grip's double-click re-docks it), the view, the request text, the prompt, the attachment and reply choices, and every settings field as typed. Settings are per provider: switching the provider swaps endpoint, model, API version, key and key scope to that provider's remembered values. A Structure tab sets what a right-click on an Outline / Tree row starts with (the prompt for *Answer me*, the prompt for *Replace this element*, the attachments); the popup on such a row takes the request, the answer / replace choice, the prompt and the attachments, selects the element, opens the assistant and sends — the answer is shown under a note of what was asked, or replaces the element (Undo); the Ask view's own choices stay. The structure and assistant panels collapse to their header (▾ / ▸, remembered per deck); tree rows wider than the structure panel scroll sideways with a visible scrollbar.
- Persist edits as `{ path, kind: 'html' | 'style' | 'group' | 'attrs', original, value }` in `localStorage` under `nbg-deck-edits:<pathname>#<title>`; re-apply them on load, dropping entries whose original markup no longer matches.
- *Save edited copy* downloads `<name>-edited.html`: the edits applied to a pristine snapshot of the deck taken at load, so the copy loads like the original, stays self-contained and carries the menu. *Discard changes on this slide* restores only the slide under the pointer; *Discard edits* restores every slide and clears storage.
- *Export to PDF* commits any open edit, applies the shared print layout, opens the browser print dialog, and restores the interactive deck (classes, inline styles, attributes, viewport-fit scaling) when the dialog closes; Ctrl/Cmd+P and the browser Print command behave the same through `beforeprint`/`afterprint`.
- Preset the page (`@page { size: <slide box>; margin: 0 }`, `print-color-adjust: exact`) so the viewer only chooses *Save as PDF*.
- Expose `window.nbgDeck = { version, pdf, edit: { …, discardSlide, listFor, slideAt }, toolbars: { mode, set, visible, sync, names, fold, detach, reattach, detached }, ai: { open, close, isOpen, view, send, test, settings, prompts: { list, get, add, update, remove, select, selected, builtin }, attach, clearImage, image, request, reply, apply, undo, capture, hooks, lastRequest, providers, system, modes }, code: { open, show, close, isOpen, tab, refresh, target, source, setSource, apply, revert, rowOf, outlineRowOf, filter }, shape: { select, selectMany, add, remove, toggle, solo, selectAll, deselect, selected, selection, reset, align, distribute, order, group, ungroup, groupOf, shapesOf, stackAt, enclosing, inside }, resolveTextTarget, resolveShapeTarget }` (and the `window.nbgPdf` alias); honour `window.__nbgPdfExternal` so an external driver can print without the hooks interfering.
- The menu edits text, text formatting (fonts limited to the design system's stacks, colours to the NBG palette), geometry, stacking order and grouping only; images, new elements and structure remain the skill's job; shape changes do not re-flow neighbours (Distribute restores even spacing). The CLI exporter prints the file on disk, not unsaved in-browser edits.

### How to Use
```bash
node "<skill-root>/scripts/add-deck-menu.mjs" my-deck.html          # add / upgrade
node "<skill-root>/scripts/add-deck-menu.mjs" my-deck.html --remove # strip (only if the user declines it)
```
Tell the recipient in one line: double-click any text to edit it (Enter applies, Esc cancels); right-click for *Resize / move shape* (Shift+click or Shift+drag selects several; the toolbar orders, aligns, distributes and groups them), *Edit SVG* (the parts of a drawn icon, diagram or chart), *Export to PDF* and *Save edited copy*.

## Per-Deck Rebuild Script

### Function
Deliver, with every deck's HTML and PDF, a `<deck>.rebuild.mjs` script that re-embeds the skill's current in-deck editing tools (the inlined right-click menu block: menu, toolbars, structure panel, assistant, print layout) into that deck after the skill was updated — without regenerating the deck — then verifies the deck and re-exports its PDF.

### Script
- `scripts/write-rebuild-script.mjs` — writes `<deck>.rebuild.mjs` next to a deck that carries the editor block (zero-dependency Node ≥ 18; exports `buildRecord`, `renderRebuildScript`, `shippedBlockVersion`, `readPluginVersion`)
- the generated `<deck>.rebuild.mjs` — self-contained; imports `addMenu` from the resolved `add-deck-menu.mjs` and spawns `verify-deck.mjs` and `export-pdf.mjs`

### Functional Requirements
- Generated after `add-deck-menu.mjs` (a deck without the editor block, the old PDF-only block and page-mode blocks are refused with a message; `--size` must be `WxH`).
- Record in the generated script, as plain JSON: the deck and PDF file names relative to the script (`--pdf <file>` for another PDF, `--no-pdf` when none was delivered), the skill's `scripts/` directory, the embedded block version, the plugin version when the skill sits in its plugin checkout, the block's configuration and the exporter options (`--selector` — the block's `root` when it is not `.slide` — and `--size`). Warn when the PDF does not exist yet. `-o` names the script.
- The generated script: `--check` reports `RESULT: CURRENT` (exit 0) or `REBUILD NEEDED` (exit 1) without writing; otherwise back the deck up to `<name>.backup-<stamp>.html` (unless `--no-backup`), replace the editor block with the skill's current one keeping the recorded configuration (status added / refreshed / upgraded from vN / already current; the slides are untouched), run `verify-deck.mjs --strict` (stop with exit 1 on failure), export the PDF with `export-pdf.mjs` and the recorded options (exit 3 when no browser exists; `--no-pdf` skips, `--pdf <file>` redirects); a deck given as argument is rebuilt instead (its PDF lands next to it).
- Resolve the skill's scripts through `--scripts <dir>`, then `NBG_DESIGN_SCRIPTS`, then the recorded directory; require `add-deck-menu.mjs`, `verify-deck.mjs`, `export-pdf.mjs`, `lib/deck-menu.js`, `lib/print-layout.js` there and exit 1 naming the source and the path otherwise; never try another location.
- Exit codes: 0 rebuilt / current, 1 error / gate failed / not current, 2 usage, 3 HTML rebuilt but no browser for the PDF.
- The agent delivers the three files together and tells the recipient that `node <deck>.rebuild.mjs` refreshes the editing tools and the PDF after a skill update (`NBG_DESIGN_SCRIPTS` or `--scripts` when the skill lives elsewhere).

### How to Use
```bash
node "<skill-root>/scripts/write-rebuild-script.mjs" my-deck.html                 # writes my-deck.rebuild.mjs (PDF: my-deck.pdf)
node "<skill-root>/scripts/write-rebuild-script.mjs" my-deck.html --pdf out/my-deck.pdf
node my-deck.rebuild.mjs --check                                                    # is the deck's editor current?
node my-deck.rebuild.mjs                                                            # rebuild: backup, new editor block, verify, PDF
NBG_DESIGN_SCRIPTS=~/.claude/plugins/.../skills/nbg-design/scripts node my-deck.rebuild.mjs
```

## Photography Catalogue

### Function
Give the agent a documented choice of bundled photography — five lifestyle photos and, since v1.17.0, 21 technology photos (seven subjects × three variants) — each with a ready-to-embed data URI and a placeholder token.

### Functional Requirements
- Every photo in `NBG-Design/assets/` is `photo-<stem>.jpeg` + `photo-<stem>.datauri.txt` and is placed with `{{PHOTO_<STEM>}}` (upper case, `-` → `_`); `embed-assets.mjs` resolves the token by file name, so adding a photo needs no script change.
- `SKILL.md` → "Photography catalogue" lists every photo with orientation, subject and typical use; the agent picks by subject and orientation, crops with `cover` rather than stretching, and uses one variant of a subject per deck unless repetition is deliberate.
- The technology set follows the palette (deep teal accent, warm neutrals, cream), carries no text, logos or UI labels, and is delivered at a 2000 px long edge.
- Generated images are added only after the user has reviewed thumbnails and chosen which to keep; the original photos are never replaced.

### How to Use
Pick a stem from the catalogue, write its token where the image goes (`background-image: url("{{PHOTO_NETWORK_2}}")` or `<img src="{{PHOTO_SECURITY_1}}">`), then run the standard gate: `embed-assets.mjs` → `add-deck-menu.mjs` → `verify-deck.mjs --strict`.

## Preview-Safe PDF Export (soft-mask re-anchoring)

### Function
Make the exported PDF render its shadows in macOS Preview / Quick Look / Safari, whose PDF engine mis-positions Chrome's luminosity soft masks (blurred `box-shadow`s): outside the top-left 24 % of the page a shadow becomes a solid gray block, across it the shadow disappears.

### Script
`scripts/lib/pdf-soft-masks.mjs` (library; used by `export-pdf.mjs`) and `scripts/fix-pdf-soft-masks.mjs` (CLI for existing PDFs). Zero dependencies.

### Functional Requirements
- `export-pdf.mjs` re-anchors every luminosity soft-mask form to page space before writing the file (`/Matrix` = inverse of the transform at its `gs`, content prefixed with that transform, BBox mapped) and reports `soft masks re-anchored for macOS Preview: N`; `--keep-soft-masks` leaves Chrome's output byte for byte; an unsupported PDF structure is written as printed with a visible `!` note.
- The rewrite changes coordinate bookkeeping only: spec-compliant viewers (Chrome, Acrobat, Firefox, poppler) render before and after pixel-identically. It is appended as an incremental update and is idempotent.
- `fix-pdf-soft-masks.mjs <pdf> [-o <out>] [--check]` applies the same rewrite to a PDF exported earlier or saved from the browser's print dialog; `--check` exits 0 when nothing needs re-anchoring, 1 otherwise.
- A mask set under several transforms, an unreadable mask form, cross-reference streams or encryption are reported and left untouched — never silently altered.
- The in-deck menu's print path (Export to PDF, Ctrl/Cmd+P; block v13) prints every blurred, non-inset box-shadow as a pre-rendered image behind its element (same colour, offsets, blur, spread, radii; element kept vector) because the browser's PDF cannot be post-processed; the deck is restored byte for byte afterwards. `window.nbgDeckMenuConfig.rasterShadows = false` keeps the CSS shadows.

### How to Use
```
node "<skill-root>/scripts/export-pdf.mjs" my-deck.html                 # re-anchoring is on by default
node "<skill-root>/scripts/fix-pdf-soft-masks.mjs" older-deck.pdf --check
node "<skill-root>/scripts/fix-pdf-soft-masks.mjs" older-deck.pdf        # in place; -o writes elsewhere
```

## Updating an Existing Deck

### Function
Bring a deck that already exists — delivered earlier, or a user's own — to the skill's current editing tools (the inlined `nbg-deck-menu-script` block) without regenerating it, and re-export its PDF.

### Scripts
`<deck>.rebuild.mjs` (delivered next to every deck since v1.16.0; written by `write-rebuild-script.mjs`), else `add-deck-menu.mjs` → `verify-deck.mjs --strict` → `write-rebuild-script.mjs` → `export-pdf.mjs` by hand (`fix-pdf-soft-masks.mjs` when the PDF cannot be re-exported on the host).

### Functional Requirements
- The slides, copy, CSS, embedded images and logos are never touched; only the editor block is replaced and the PDF re-exported. A backup copy of the deck is kept (`<deck>.backup-<stamp>.html`, by the rebuild script or by hand).
- `add-deck-menu.mjs` is idempotent (`added` / `upgraded from vN` / `refreshed` / `already current`), recognises the v1 PDF-only block, and carries the existing block's configuration (`window.nbgDeckMenuConfig`) over.
- The agent reads the deck's block version (`data-nbg-deck-menu="N"`) and the skill's (`var VERSION` in `lib/deck-menu.js`), reports old → new, PASS of the strict gate and of the export, and the backup file name.
- Viewers' in-browser edits (stored per file path and title) survive an update in place; a copy under a new name starts clean.

### How to Use
`SKILL.md` → "Updating an existing deck to the current skill" (symptoms of an old block, both paths, the block-version history).
