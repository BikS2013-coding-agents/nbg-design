#!/usr/bin/env node
// NBG Design — export an HTML deck to an editable PowerPoint (.pptx).
//
// The deck is opened in headless Chrome/Chromium/Edge (DevTools protocol over --remote-debugging-pipe,
// nothing to install) and laid out by the same print-layout shim export-pdf.mjs uses (every slide
// visible at its native artboard size, navigation chrome hidden, animations at their end state).
// lib/pptx-extract.js then measures every slide in the browser and lib/pptx-writer.mjs writes it as
// native PowerPoint objects — never as screenshots:
//
//   - text → text boxes with real runs (typeface, size, weight, italic, colour, letter-spacing,
//     underline, all-caps, super/subscript, links, line breaks, exact line spacing), placed where
//     Chrome put the lines; editable and searchable;
//   - boxes, cards, rules, borders, pills → shapes (rounded corners, solid or gradient fills,
//     outlines, outer shadows, transparency);
//   - photographs and logos → pictures with their full source and a crop (re-croppable), the CSS
//     filter of a photo grade baked in;
//   - inline SVG (charts, icons, diagrams) → SVG pictures with a PNG fallback (PowerPoint:
//     right-click → Convert to Shape turns them into native shapes);
//   - the theme fonts and colours of the presentation are the deck's own (font scheme from the
//     slide text, colour scheme from the deck's theme), so new text and the colour picker match.
//
// The slide is PowerPoint's 16:9 (13.333 x 7.5 in) for the 1920 x 1080 artboard: 1 px = 0.5 pt.
// Fonts are referenced by name, not embedded: the presenting machine needs the deck's fonts
// (Aptos ships with Office; IBM Plex and Oswald are free downloads) — the report lists them.
// Check the result with compare-pptx.mjs (renders the .pptx and the deck side by side).
//
// Zero dependencies. Node >= 18.
// Exit: 0 = written, 1 = error, 3 = no browser found.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findBrowser, NO_BROWSER_EXIT_CODE } from './lib/find-browser.mjs';
import { launchBrowser, openPage, navigate, evaluate } from './lib/cdp.mjs';
import { buildPptx } from './lib/pptx-writer.mjs';

const PRINT_LAYOUT_SRC = readFileSync(new URL('./lib/print-layout.js', import.meta.url), 'utf8');
const EXTRACT_SRC = readFileSync(new URL('./lib/pptx-extract.js', import.meta.url), 'utf8');

// The theme fonts (headings / body) and colour schemes of the skill's themes (SKILL.md "Themes"; the same palettes as lib/deck-menu.js).
export const THEME_SCHEMES = {
  nbg: { major: 'Aptos', minor: 'Aptos', dk1: '0A1416', lt1: 'FFFFFF', dk2: '003841', lt2: 'F5F8F6', accents: ['007B85', '003841', '00ADBF', '00CFE7', '5B6B6D', '0A1416'] },
  biks2013: { major: 'Avenir Next', minor: 'Avenir Next', dk1: '111316', lt1: 'FFFFFF', dk2: '1B1D21', lt2: 'F6F3EC', accents: ['C8623A', '1B1D21', 'E08A5E', 'E3A64A', '6E7379', '111316'] },
  aihub: { major: 'Oswald', minor: 'Segoe UI', dk1: '012A30', lt1: 'FFFFFF', dk2: '024A6C', lt2: 'F3F6F8', accents: ['1C869D', '012A30', '33B3BF', 'FFDB7A', 'FFF77D', 'B1BACC'] },
  instrument: { major: 'IBM Plex Sans', minor: 'IBM Plex Sans', dk1: '0E1726', lt1: 'FFFFFF', dk2: '24334A', lt2: 'E9EEF5', accents: ['2F7D6E', 'E0A32E', 'C4441C', '7D8CA3', '3C4E6B', '1A1A18'] },
};

const USAGE = `NBG deck PowerPoint exporter (needs a browser; editable text, shapes and pictures)
Usage: node export-pptx.mjs <deck.html> [-o <out.pptx>] [--theme nbg|biks2013|aihub|instrument]
                                      [--selector <css>] [--wrap-slack <fraction>] [--keep-line-breaks]
                                      [--settle <ms>]
                                      [--timeout <ms>] [--browser <path>] [--json <model.json>]

  -o, --out          Output path (default: next to the deck, same name, .pptx).
  --theme <name>     Fonts and colour scheme of the presentation theme (default: the theme recorded
                     in the deck's menu block; a deck without one gets the NBG colours and, as theme
                     font, the face carrying most of its text).
  --selector <css>   Slide selector (default ".slide"; nested matches are ignored).
  --wrap-slack <f>   Extra width given to wrapping text boxes, as a fraction (default 0.02), so a
                     renderer whose font metrics differ by a hair does not add a line.
  --keep-line-breaks Carry every line break Chrome drew into the text (identical wrapping; editing then
                     does not reflow). Without it only text-wrap: balance / pretty text keeps its breaks.
  --settle <ms>      Extra wait after fonts/images are ready, before measuring (default 400).
  --timeout <ms>     Overall timeout for the browser session (default 180000).
  --browser <path>   Explicit browser binary (else auto-detect; or env NBG_BROWSER / CHROME_BIN).
  --json <path>      Also write the measured slide model (debugging).

Exit: 0 = written, 1 = error, 3 = no browser found.`;

function parseArgs(argv) {
  const a = { _: [], settle: 400, timeout: 180000, selector: '.slide', wrapSlack: 0.02 };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '-o' || x === '--out') a.out = argv[++i];
    else if (x === '--theme') a.theme = argv[++i];
    else if (x === '--selector') a.selector = argv[++i];
    else if (x === '--wrap-slack') a.wrapSlack = parseFloat(argv[++i]);
    else if (x === '--settle') a.settle = parseInt(argv[++i], 10);
    else if (x === '--timeout') a.timeout = parseInt(argv[++i], 10);
    else if (x === '--browser') a.browser = argv[++i];
    else if (x === '--json') a.json = argv[++i];
    else if (x === '--keep-line-breaks') a.keepLineBreaks = true;
    else if (x === '-h' || x === '--help') a.help = true;
    else a._.push(x);
  }
  return a;
}

/** Measure the deck in a headless browser. Returns { model, diag, theme, title }. */
export async function measureDeck(deck, args) {
  const browser = findBrowser(args.browser);
  if (browser && browser.error) throw new Error(browser.error);
  if (!browser) return { noBrowser: true };
  const { cdp, exited, close } = launchBrowser(browser);
  const deadline = new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out after ${args.timeout} ms`)), args.timeout).unref());
  const work = (async () => {
    const { sessionId } = await openPage(cdp);
    await navigate(cdp, sessionId, pathToFileURL(deck).href, args.timeout);
    const prep = `(async () => { window.__nbgPdfExternal = true; ${PRINT_LAYOUT_SRC}\n return nbgPreparePrintLayout(${JSON.stringify({ selector: args.selector, rasterShadows: false })}); })()`;
    const diag = await evaluate(cdp, sessionId, prep);
    if (!diag.slides) throw new Error(`no slides detected (${diag.notes.join('; ')}) — pass --selector if the deck does not use .slide`);
    if (args.settle > 0) await new Promise((r) => setTimeout(r, args.settle));
    const meta = await evaluate(cdp, sessionId, '({ theme: (window.nbgDeckMenuConfig && window.nbgDeckMenuConfig.theme) || null, title: document.title || "" })');
    const model = await evaluate(cdp, sessionId, `(async () => { ${EXTRACT_SRC}\n return nbgExtractPptx(${JSON.stringify({ selector: args.selector, wrapSlack: args.wrapSlack, keepLineBreaks: !!args.keepLineBreaks })}); })()`);
    await resolveRenderedFaces(cdp, sessionId, model);
    if (args.afterExtract) await args.afterExtract(cdp, sessionId, model);
    try { await cdp.send('Browser.close'); } catch { /* already gone */ }
    return { model, diag, theme: meta.theme, title: meta.title };
  })();
  try { return await Promise.race([work, deadline, exited]); } finally { close(); }
}

// PostScript style suffix → CSS weight
const PS_WEIGHTS = [[/(Hairline|Thin)/i, 100], [/(ExtraLight|UltraLight)/i, 200], [/Light/i, 300], [/Medium/i, 500],
  [/(SemiBold|DemiBold|Semibold)/i, 600], [/(ExtraBold|UltraBold|Heavy)/i, 800], [/Black/i, 900], [/Bold/i, 700]];

/**
 * The weight and style Chrome actually drew each run with (CSS.getPlatformFontsForNode): a deck that
 * ships, say, only the 300 and 500 faces of a family renders a 400 request with the 500 face, and
 * PowerPoint must name that face. Only faces of the run's own family are taken over.
 */
async function resolveRenderedFaces(cdp, sessionId, model) {
  const fids = new Set();
  model.slides.forEach((s) => s.items.forEach((it) => { if (it.type === 'text') it.paragraph.runs.forEach((r) => r.fid && fids.add(r.fid)); }));
  if (!fids.size) return;
  await cdp.send('DOM.enable', {}, sessionId);
  await cdp.send('CSS.enable', {}, sessionId);
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 }, sessionId);
  const faces = new Map();
  for (const fid of fids) {
    try {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-nbg-f="${fid}"]` }, sessionId);
      if (!nodeId) continue;
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId }, sessionId);
      if (fonts && fonts.length) faces.set(fid, fonts);
    } catch { /* node without text layout */ }
  }
  const squash = (s) => String(s || '').replace(/[\s-]/g, '').toLowerCase();
  const styleOf = (f) => {
    const [psFamily, psStyle = 'Regular'] = String(f.postScriptName || '').split('-');
    return { psFamily, weight: (PS_WEIGHTS.find(([re]) => re.test(psStyle)) || [null, 400])[1], italic: /(Italic|Oblique)/i.test(psStyle) };
  };
  model.slides.forEach((s) => s.items.forEach((it) => {
    if (it.type !== 'text') return;
    it.paragraph.runs.forEach((r) => {
      const list = faces.get(r.fid);
      if (!list) return;
      // an element's report also counts the glyphs of its children (a <b> inside a <p>): among the faces
      // of the run's own family, the one nearest the requested weight and style is the run's
      const own = list.map(styleOf).filter((f) => f.psFamily && squash(f.psFamily).startsWith(squash(r.font).slice(0, Math.max(4, squash(f.psFamily).length))));
      if (!own.length) {
        // the run's family is not on this host (an Office face kept for PowerPoint): record the face Chrome
        // drew instead, for targets that cannot name the authored face — the family carrying most glyphs, and
        // of its faces the one nearest the run's own weight (the report counts the children's glyphs too, so
        // the most-used face may be a <b> child's)
        const byFam = new Map();
        list.forEach((f) => { if (f.familyName) byFam.set(f.familyName, (byFam.get(f.familyName) || 0) + (f.glyphCount || 0)); });
        const fam = [...byFam.entries()].sort((a, b) => b[1] - a[1])[0];
        if (!fam) return;
        const faces = list.filter((f) => f.familyName === fam[0]).map(styleOf)
          .sort((a, b) => (Math.abs(a.weight - r.weight) + (a.italic !== r.italic) * 1000) - (Math.abs(b.weight - r.weight) + (b.italic !== r.italic) * 1000));
        // a variable face (the macOS system font) reports one "Regular" face for every weight: then the CSS
        // weight is the one drawn
        const variable = faces.length === 1 && faces[0].weight === 400 && r.weight !== 400;
        r.rendered = { family: fam[0], weight: variable ? r.weight : faces[0].weight, italic: faces[0].italic };
        return;
      }
      own.sort((a, b) => (Math.abs(a.weight - r.weight) + (a.italic !== r.italic) * 1000) - (Math.abs(b.weight - r.weight) + (b.italic !== r.italic) * 1000));
      r.weight = own[0].weight;
      r.italic = own[0].italic || r.italic;
    });
  }));
}

/** The deck's main text face: the family carrying the most characters. */
function dominantFont(fonts) {
  const e = Object.entries(fonts || {}).sort((a, b) => b[1] - a[1]);
  return e.length ? e[0][0] : null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length !== 1) { console.log(USAGE); process.exit(args.help ? 0 : 2); }
  if (args.theme && !THEME_SCHEMES[args.theme]) { console.error(`export-pptx ERROR: unknown --theme "${args.theme}" (expected ${Object.keys(THEME_SCHEMES).join(', ')})`); process.exit(2); }
  if (!(args.wrapSlack >= 0 && args.wrapSlack < 0.5)) { console.error('export-pptx ERROR: --wrap-slack must be a fraction between 0 and 0.5'); process.exit(2); }
  const deck = resolve(process.cwd(), args._[0]);
  if (!existsSync(deck)) { console.error('export-pptx ERROR: not found: ' + deck); process.exit(1); }
  const out = resolve(process.cwd(), args.out || join(dirname(deck), basename(deck).replace(/\.html?$/i, '') + '.pptx'));

  let r;
  try { r = await measureDeck(deck, args); }
  catch (e) { console.error('export-pptx ERROR: ' + e.message); process.exit(1); }
  if (r.noBrowser) {
    console.error('No Chrome/Chromium/Edge binary found — PowerPoint export measures the deck in a browser engine.');
    console.error('  Install Chrome/Chromium on this host, or set NBG_BROWSER / CHROME_BIN, or pass --browser <path>.');
    process.exit(NO_BROWSER_EXIT_CODE);
  }
  const { model, diag } = r;
  if (args.json) writeFileSync(resolve(process.cwd(), args.json), JSON.stringify(model, null, 1));

  const themeName = args.theme || r.theme || 'nbg';
  if (!THEME_SCHEMES[themeName]) { console.error(`export-pptx ERROR: the deck records an unknown theme "${themeName}" — pass --theme`); process.exit(1); }
  // theme fonts: the deck theme's own faces when the theme is known (recorded in the deck or --theme),
  // else the face carrying most of the text
  const scheme = THEME_SCHEMES[themeName];
  const known = !!(args.theme || r.theme);
  const font = dominantFont(model.fonts);
  let built;
  try {
    built = buildPptx(model, { title: r.title, fontMajor: known ? scheme.major : font, fontMinor: known ? scheme.minor : font, scheme });
  } catch (e) { console.error('export-pptx ERROR: ' + (e.stack || e.message)); process.exit(1); }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, built.buf);

  const counts = { text: 0, shape: 0, image: 0, line: 0, svg: 0 };
  model.slides.forEach((s) => s.items.forEach((it) => { counts[it.type]++; if (it.type === 'image' && it.svg) counts.svg++; }));
  const kb = Math.round(built.buf.length / 1024);
  console.log(`\nNBG deck PowerPoint export — ${out}`);
  console.log(`  slides: ${model.slides.length} | artboard: ${Math.round(model.width)}x${Math.round(model.height)} px → 13.333 x ${(7.5 * (model.height / model.width) / (1080 / 1920)).toFixed(3)} in | size: ${kb.toLocaleString()} KB | theme colours: ${themeName}`);
  console.log(`  text boxes: ${counts.text} | shapes: ${counts.shape + counts.line} | pictures: ${counts.image - counts.svg} | SVG pictures: ${counts.svg} | media files: ${built.media}`);
  console.log(`  typefaces referenced: ${built.fonts.join(', ')}`);
  console.log('    (not embedded — install them where the deck is presented or edited; PowerPoint substitutes missing faces)');
  if (diag.sizeMismatch.length) console.log(`  ! slide box differs from slide 1 on slide(s) ${diag.sizeMismatch.map((m) => m.slide).join(', ')} — positions are relative to each slide's own box`);
  model.warnings.forEach((w) => console.log(`  ! ${w.msg}${w.count > 1 ? ` (${w.count}x)` : ''}`));
  console.log('\nNow check it: node compare-pptx.mjs <deck.html> <deck.pptx> renders both and writes side-by-side PNGs — READ them.\n');
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
