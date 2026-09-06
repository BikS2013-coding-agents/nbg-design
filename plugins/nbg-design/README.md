# nbg-design

Use when creating presentations in a design system inspired by the brand image of the National Bank of Greece (NBG), HTML slides (with a built-in right-click menu: in-place text editing with a formatting toolbar, shape resize/move with a shape toolbar, multi-selection with align / distribute / order / group, an AI assistant panel, "Export to PDF", "Save edited copy"), slide specifications, PDF exports of HTML decks (one page per slide, aesthetics preserved) — all on the bundled NBG-inspired presentation design system, templates, logos, photography, screenshots, and guardrails.

## Overview

This skill packages a presentation design system inspired by the brand image of the National Bank of Greece (NBG) as a user-level Pi skill so it can be used from any working directory.

Output formats: `html` (default, fully self-contained), `pdf` (exported from the HTML deck by the bundled
`scripts/export-pdf.mjs` — one page per slide at the 1920×1080 artboard, vector text, backgrounds and
embedded images preserved; needs Chrome/Chromium/Edge on the host). PowerPoint output is out of scope: HTML presentations and their PDF export only.

Every delivered HTML deck also carries a right-click menu (`scripts/add-deck-menu.mjs`):

- **Edit text** — double-click any text on a slide (or right-click it → *Edit text*) and edit it in
  place; Enter applies, Esc cancels. A movable toolbar offers bold / italic / underline / strikethrough,
  larger / smaller / exact font size, font family, NBG palette colours, alignment and Clear — applied
  to the selected text only, or to the whole block when nothing is selected.
- **Resize / move shape** — right-click a card, photo panel, image or text block: a selection frame
  with handles appears; drag to resize (Shift keeps proportions) or move, arrows nudge, Esc finishes.
  A movable shape toolbar sets X/Y/W/H, fill, border, corner radius, opacity and shadow.
  *Reset shape* restores one element.
- **Several shapes at once** — Shift+click adds the smallest shape under the pointer, Shift+drag draws a selection box, Ctrl/Cmd+A
  selects the whole slide; move, scale and style them together, and use the toolbar's arrange row to
  bring to front / send to back, align (left, centre, right, top, middle, bottom), distribute with
  equal gaps, and group / ungroup. Nested or overlapping shapes: the menu's *Select at this point*
  list, the toolbar's Stack list and Tab / Shift+Tab reach every level; Ctrl/Cmd+click a card to select
  everything inside it.
- **Edit SVG** — right-click a drawn icon, diagram or chart (an inline SVG): its parts — paths, shapes,
  text, groups — become selectable (Shift+click picks several, Ctrl/Cmd+click inside a selected group picks its members, Ctrl/Cmd+A all); drag to move, handles
  resize, arrows nudge — the whole selection together; the toolbar's SVG row sets
  fill, stroke, stroke width, opacity and the text of a label, orders, duplicates and deletes parts, and
  *Reset SVG* restores the drawing. Path data is never rewritten.
- **Show structure / Show HTML** — a panel with an outline of the slide's shapes (checkboxes to
  select several, All / None, filter), the element tree synced both ways with the selection, and
  the selected element's editable source; Apply records the change like every other edit
  (scripts are stripped).
- **One toolbar, three tabs** — Text, Shape and SVG share one floating panel; the tab of the editor in
  use comes to the front by itself, the others stay a click away. The menu's Toolbars section ticks the
  tabs: click one to bring it to the front and pin it, click the one in front (or its ✕) to hide it,
  *Automatic* for the default. Every tab adapts to the selection; the Text tab also formats selected text
  blocks without entering edit mode.
- **The Assistant tab** — a panel that sends a request to an AI model together with, each optional,
  a screenshot of the slide, the slide's source, the selected element's source and an image from
  the clipboard; prompts come from a drop-down (built-in ones plus your own, editable); the reply is
  shown, or replaces the selected element (recorded like every other edit, with Undo). Providers:
  Anthropic, Azure-hosted Anthropic (Microsoft Foundry), OpenAI-compatible, Azure OpenAI, DeepSeek.
  Endpoint, model and API key are entered by the viewer and kept in their browser only.
- **Detachable panels** — ⧉ moves the shape toolbar, the structure panel or the assistant into a window
  of its own (Picture-in-Picture in Chrome / Edge: always on top, movable anywhere; a pop-up elsewhere);
  it keeps working on the deck; closing the window brings it back.
- Edits survive a reload and **Save edited copy** downloads the deck with the changes baked in;
  **Discard changes on this slide** restores one slide, **Discard edits** restores them all.
- **Export to PDF** — choose *Save as PDF* in the browser's print dialog and get the same
  one-page-per-slide PDF as the CLI exporter, with no tooling installed.

Every deck is delivered as three files: `<deck>.html`, `<deck>.pdf` and **`<deck>.rebuild.mjs`**
(`scripts/write-rebuild-script.mjs`). The editing tools above are inlined into the HTML at delivery
time; when this plugin is updated, `node <deck>.rebuild.mjs` embeds the new version of those tools
into the deck (slides untouched, a backup kept), verifies it and re-exports the PDF — `--check` only
reports whether a rebuild is needed. The script finds the skill through `--scripts`, `NBG_DESIGN_SCRIPTS`
or the location recorded at delivery, and errors otherwise.

Bundled photography: five lifestyle photos (fields, heart, Parthenon, skate, street) and 21
technology photos — data centre, team analytics, abstract network, microchip, Athens at dusk,
security, developer; three takes each, generated with the current OpenAI and Google image models
in the NBG teal-and-cream palette. Every photo has a ready-to-embed data URI and a `{{PHOTO_…}}`
token; `SKILL.md` → "Photography catalogue" describes each one so the right subject and orientation
are picked per slide.

## Installation

The plugin is distributed through the public marketplace
[BikS2013-coding-agents/nbg-design](https://github.com/BikS2013-coding-agents/nbg-design):

```bash
/plugin marketplace add BikS2013-coding-agents/nbg-design
/plugin install nbg-design@nbg-design
```

## Usage

This plugin provides the `nbg-design` skill which Claude will use automatically based on context.

## Documentation

See `skills/nbg-design/SKILL.md` for complete documentation.

## License

MIT
