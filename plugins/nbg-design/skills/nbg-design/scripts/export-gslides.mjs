#!/usr/bin/env node
// NBG Design — export an HTML deck to an editable Google Slides presentation.
//
// The deck is measured exactly as export-pptx.mjs does it (headless Chrome, print-layout shim, every
// slide as native text boxes, shapes and pictures — never screenshots), written as a .pptx tuned for
// Google Slides, uploaded to Google Drive and converted there (Drive's PowerPoint import), and then
// corrected through the Slides API where the import loses something:
//
//   - typefaces: Slides draws only its own font list. Every run is given the face Chrome drew, or, when
//     Slides lacks it, the closest Google Fonts face (lib/gslides-fonts.mjs: Aptos → Source Sans 3,
//     Segoe UI → Open Sans, Avenir Next → Nunito Sans, Menlo → JetBrains Mono, …); after the import each
//     run's family and exact weight (Light, Medium, SemiBold…) is set through the API, since the
//     import keeps only regular and bold;
//   - translucent text: Slides has no text transparency, so a translucent colour is blended with what
//     lies under the text box in the deck (sampled from a capture with the text hidden);
//   - line breaks: Chrome's are carried into the text by default (the substitute faces differ in width
//     by a few per cent; --reflow lets Slides wrap instead).
//
// Google access goes through the Google Workspace CLI (gws), signed in with the Drive and Slides scopes:
// it owns the OAuth flow and the token; nothing here handles credentials.
// Check the result with: node compare-pptx.mjs <deck.html> <presentation URL> (or pass --check).
//
// Zero dependencies. Node >= 18. Needs a browser, gws, and network access.
// Exit: 0 = created, 1 = error, 2 = bad arguments, 3 = no browser / no gws.

import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { NO_BROWSER_EXIT_CODE } from './lib/find-browser.mjs';
import { evaluate } from './lib/cdp.mjs';
import { buildPptx, GSLIDES_BASELINE } from './lib/pptx-writer.mjs';
import { measureDeck, THEME_SCHEMES } from './export-pptx.mjs';
import { resolveSlidesFonts } from './lib/gslides-fonts.mjs';
import { findGws, checkAuth, uploadPptxAsSlides, getPresentation, batchUpdate, slidesUrl } from './lib/gslides.mjs';

const USAGE = `NBG deck → Google Slides exporter (needs a browser and the gws CLI; editable text, shapes and pictures)
Usage: node export-gslides.mjs <deck.html> [--name <title>] [--folder <Drive folder id>] [--pptx <path>]
                                         [--theme nbg|biks2013|aihub|instrument] [--reflow] [--selector <css>]
                                         [--check <dir>] [--gws <path>] [--browser <path>] [--timeout <ms>]

  --name <title>     Name of the presentation in Drive (default: the deck's <title>, else its file name).
  --folder <id>      Drive folder to create it in (default: My Drive root).
  --pptx <path>      Also keep the intermediate Slides-tuned .pptx there.
  --theme <name>     Theme fonts / colours of the presentation (default: the theme recorded in the deck).
  --reflow           Let Slides wrap paragraphs itself instead of keeping Chrome's line breaks.
  --selector <css>   Slide selector (default ".slide").
  --check <dir>      After creating it, run compare-pptx.mjs against the presentation into <dir>.
  --gws <path>       Google Workspace CLI binary (else gws on PATH). Sign in once: gws auth login.
  --browser <path>   Explicit browser binary (else auto-detect; or env NBG_BROWSER / CHROME_BIN).
  --timeout <ms>     Timeout of the browser session and of each Google call (default 600000).

Prints the presentation URL. Exit: 0 = created, 1 = error, 2 = bad arguments, 3 = no browser / no gws.`;

function parseArgs(argv) {
  const a = { _: [], settle: 400, timeout: 600000, selector: '.slide', wrapSlack: 0.02 };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--name') a.name = argv[++i];
    else if (x === '--folder') a.folder = argv[++i];
    else if (x === '--pptx') a.pptx = argv[++i];
    else if (x === '--theme') a.theme = argv[++i];
    else if (x === '--reflow') a.reflow = true;
    else if (x === '--selector') a.selector = argv[++i];
    else if (x === '--check') a.check = argv[++i];
    else if (x === '--gws') a.gws = argv[++i];
    else if (x === '--browser') a.browser = argv[++i];
    else if (x === '--timeout') a.timeout = parseInt(argv[++i], 10);
    else if (x === '-h' || x === '--help') a.help = true;
    else a._.push(x);
  }
  return a;
}

/**
 * Slides has no text transparency: blend every translucent run colour with what the deck shows under
 * its text box. The slides are captured with the glyphs made transparent (-webkit-text-fill-color, so
 * currentColor borders stay) and the dominant colour under each such box is sampled in the page.
 */
async function blendTranslucentText(cdp, sessionId, model) {
  const want = [];
  model.slides.forEach((s, si) => s.items.forEach((it, ii) => {
    if (it.type === 'text' && it.paragraph.runs.some((r) => r.color && r.color.a < 0.999)) want.push({ si, ii, x: it.x, y: it.y, w: it.w, h: it.h });
  }));
  if (!want.length) return 0;
  await evaluate(cdp, sessionId, `(() => { const st = document.createElement('style'); st.id = 'nbg-gs-hide-text';
    st.textContent = '*, *::before, *::after { -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important }';
    document.head.appendChild(st); return true; })()`);
  await new Promise((r) => setTimeout(r, 300));
  const rects = await evaluate(cdp, sessionId, `Array.from(document.querySelectorAll('.nbg-pdf-slide')).map(s => { const r = s.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; })`);
  if (rects.length !== model.slides.length) return 0;
  const bySlide = new Map();
  want.forEach((w) => { if (!bySlide.has(w.si)) bySlide.set(w.si, []); bySlide.get(w.si).push(w); });
  let n = 0;
  for (const [si, boxes] of bySlide) {
    const r = rects[si];
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } }, sessionId);
    const k = r.w / model.width;
    const means = await evaluate(cdp, sessionId, `(async () => {
      const im = new Image(); im.src = 'data:image/png;base64,${shot.data}'; await im.decode();
      const c = new OffscreenCanvas(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0);
      return ${JSON.stringify(boxes.map((b) => ({ x: b.x * k, y: b.y * k, w: b.w * k, h: b.h * k })))}.map((b) => {
        const x0 = Math.max(0, Math.floor(b.x)), y0 = Math.max(0, Math.floor(b.y));
        const x1 = Math.min(im.width, Math.ceil(b.x + b.w)), y1 = Math.min(im.height, Math.ceil(b.y + b.h));
        if (x1 <= x0 || y1 <= y0) return null;
        // the dominant colour, not the mean: text over a photo edge or a block of another colour takes the
        // colour most of it sits on (a mean would be wrong everywhere)
        const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data; const bins = new Map();
        for (let i = 0; i < d.length; i += 4) {
          const key = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4);
          const e = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 }; e.n++; e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2]; bins.set(key, e);
        }
        let top = null; for (const e of bins.values()) if (!top || e.n > top.n) top = e;
        return { r: top.r / top.n, g: top.g / top.n, b: top.b / top.n };
      });
    })()`);
    boxes.forEach((b, j) => {
      const bg = means[j];
      if (!bg) return;
      model.slides[b.si].items[b.ii].paragraph.runs.forEach((run) => {
        if (!run.color || run.color.a >= 0.999) return;
        const a = run.color.a;
        run.color = { r: run.color.r * a + bg.r * (1 - a), g: run.color.g * a + bg.g * (1 - a), b: run.color.b * a + bg.b * (1 - a), a: 1 };
        n++;
      });
    });
  }
  await evaluate(cdp, sessionId, `(() => { const s = document.getElementById('nbg-gs-hide-text'); if (s) s.remove(); return true; })()`);
  return n;
}

/**
 * Layout changes for Google Slides, in place:
 *   - a raised / lowered run that ends a paragraph (a "%" or unit set high beside a big figure) becomes a
 *     text box of its own where Chrome drew it: Slides has only a fixed superscript, not a free offset;
 *   - Slides wraps every text box (it has no "do not wrap"), so boxes get room on their free side —
 *     single lines always, wrapping text when Chrome's breaks are kept (the breaks then decide the lines).
 * Returns the number of runs set apart.
 */
function adaptLayout(model, reflow) {
  let split = 0;
  model.slides.forEach((s) => {
    const out = [];
    s.items.forEach((it) => {
      out.push(it);
      if (it.type !== 'text' || it.rot) return;
      const runs = it.paragraph.runs;
      const tail = [];
      for (let i = runs.length - 1; i >= 0 && !runs[i].br && runs[i].baseline && runs[i].rect; i--) tail.unshift(runs[i]);
      if (!tail.length || tail.length === runs.filter((r) => !r.br).length) return;
      it.paragraph.runs = runs.slice(0, runs.length - tail.length);
      const r0 = tail[0].rect, last = tail[tail.length - 1].rect;
      out.push({ type: 'text', rot: 0, x: r0.x, y: r0.y, w: last.x + last.w - r0.x, h: r0.h, align: 'left', wrap: false, valign: 't', lines: 1,
        paragraph: { runs: tail.map((r) => ({ ...r, baseline: 0, rect: undefined })) }, baseline: r0.base, lineHeight: r0.h, firstSize: tail[0].size, fontSize: tail[0].size });
      split += tail.length;
    });
    s.items = out;
  });
  // chip padding: PowerPoint takes it as the letter-spacing of a zero-width space, Slides drops that spacing —
  // no-break spaces of the run's font as close to the padding as whole spaces get
  let spacers = 0;
  model.slides.forEach((s) => s.items.forEach((it) => {
    if (it.type !== 'text') return;
    it.paragraph.runs.forEach((r) => {
      if (r.text !== '\u200B' || !r.spacing || !r.spaceW) return;
      r.text = '\u00A0'.repeat(Math.max(1, Math.round(r.spacing / r.spaceW)));
      r.spacing = 0; spacers++;
    });
  }));
  model.slides.forEach((s) => s.items.forEach((it) => {
    if (it.type !== 'text' || it.rot || it.align === 'justify' || (it.wrap && reflow)) return;
    const pad = Math.max(it.w * 0.08, (it.fontSize || 16) * 0.6);
    if (it.align === 'center') it.x -= pad / 2; else if (it.align === 'right') it.x -= pad;
    it.w += pad;
  }));
  return split;
}

const rgb = (c) => ({ opaqueColor: { rgbColor: { red: c.r / 255, green: c.g / 255, blue: c.b / 255 } } });

// characters that are layout, not content, on either side (Slides: \\n paragraph end, \\v line break)
const isLayout = (ch) => ch === '\n' || ch === '\u000b' || ch === ' ' || ch === '\r';

/** The updateTextStyle requests that give every run its exact Slides family and weight. */
function fontRequests(model, pres) {
  const byId = new Map();
  const walk = (els) => (els || []).forEach((e) => { byId.set(e.objectId, e); if (e.elementGroup) walk(e.elementGroup.children); });
  pres.slides.forEach((s) => walk(s.pageElements));
  const reqs = [];
  let missing = 0, mismatched = 0;
  model.slides.forEach((s, si) => s.items.forEach((it) => {
    if (it.type !== 'text' || !it.spid) return;
    const el = byId.get(`p${si + 1}_i${it.spid}`);
    const tes = el && el.shape && el.shape.text && el.shape.text.textElements;
    if (!tes) { missing++; return; }
    let full = '';
    tes.forEach((t) => { if (t.textRun) full += t.textRun.content; });
    // content characters of the Slides text, with their indices
    const idx = [];
    for (let i = 0; i < full.length; i++) if (!isLayout(full[i])) idx.push(i);
    let pos = 0, ok = true;
    const spans = [];
    for (const r of it.paragraph.runs) {
      if (r.br) continue;
      const t = [...(r.text || '')].filter((ch) => !isLayout(ch)).join('');
      if (!t.length) continue;
      if (pos + t.length > idx.length) { ok = false; break; }
      // compare loosely (Slides may upper-case an all-caps run)
      const got = idx.slice(pos, pos + t.length).map((i) => full[i]).join('');
      if (got.toLowerCase() !== t.toLowerCase()) { ok = false; break; }
      spans.push({ r, start: idx[pos], end: idx[pos + t.length - 1] + 1 });
      pos += t.length;
    }
    if (!ok || pos !== idx.length) { mismatched++; return; }
    // the import paints a bullet in the text colour; a style update over the whole text is the only one that
    // reaches the bullet, so it goes first with the bullet colour and the runs are set over it
    if (it.bullet && it.bullet.color) {
      reqs.push({ updateTextStyle: { objectId: el.objectId, textRange: { type: 'ALL' }, style: { foregroundColor: rgb(it.bullet.color) }, fields: 'foregroundColor' } });
    }
    for (const { r, start, end } of spans) {
      if (!r.gs) continue;
      // Slides: bold=false renders the regular face whatever the weight; bold=true with a weight above 700 is
      // drawn heavier but spaced as 700 (a gap after the run) — so 700 is the heaviest weight used
      const weight = Math.min(r.gs.weight, 700);
      reqs.push({ updateTextStyle: { objectId: el.objectId, textRange: { type: 'FIXED_RANGE', startIndex: start, endIndex: end },
        style: { weightedFontFamily: { fontFamily: r.gs.family, weight }, bold: weight >= 700, italic: !!(r.rendered ? r.rendered.italic : r.italic), ...(r.color ? { foregroundColor: rgb(r.color) } : {}) },
        fields: 'weightedFontFamily,bold,italic' + (r.color ? ',foregroundColor' : '') } });
    }
  }));
  return { reqs, missing, mismatched };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length !== 1) { console.log(USAGE); process.exit(args.help ? 0 : 2); }
  if (args.theme && !THEME_SCHEMES[args.theme]) { console.error(`export-gslides ERROR: unknown --theme "${args.theme}" (expected ${Object.keys(THEME_SCHEMES).join(', ')})`); process.exit(2); }
  const deck = resolve(process.cwd(), args._[0]);
  if (!existsSync(deck)) { console.error('export-gslides ERROR: not found: ' + deck); process.exit(1); }
  const gws = findGws(args.gws);
  if (!gws) {
    console.error('export-gslides: the Google Workspace CLI (gws) is not installed — it signs in to Google and calls Drive / Slides.');
    console.error('  Install it (https://github.com/googleworkspace/cli), run: gws auth login, or pass --gws <path>.');
    process.exit(NO_BROWSER_EXIT_CODE);
  }
  let user;
  try { user = checkAuth(gws); } catch (e) { console.error('export-gslides ERROR: ' + e.message); process.exit(1); }

  // ── 1. measure the deck (+ backdrops of translucent text) ──
  let r, blended = 0;
  try {
    r = await measureDeck(deck, { ...args, keepLineBreaks: !args.reflow, afterExtract: async (cdp, sid, model) => { blended = await blendTranslucentText(cdp, sid, model); } });
  } catch (e) { console.error('export-gslides ERROR: ' + e.message); process.exit(1); }
  if (r.noBrowser) {
    console.error('No Chrome/Chromium/Edge binary found — the export measures the deck in a browser engine.');
    console.error('  Install Chrome/Chromium on this host, or set NBG_BROWSER / CHROME_BIN, or pass --browser <path>.');
    process.exit(NO_BROWSER_EXIT_CODE);
  }
  const { model } = r;

  // ── 2. the faces Slides will draw; the .pptx names them ──
  const fonts = await resolveSlidesFonts(model);
  const raised = adaptLayout(model, !!args.reflow);
  model.slides.forEach((s) => s.items.forEach((it) => { if (it.type === 'text') it.paragraph.runs.forEach((run) => { if (run.gs) { run.font = run.gs.family; run.weight = run.gs.weight; if (run.rendered) run.italic = run.rendered.italic || run.italic; } }); }));
  const themeName = args.theme || r.theme || 'nbg';
  if (!THEME_SCHEMES[themeName]) { console.error(`export-gslides ERROR: the deck records an unknown theme "${themeName}" — pass --theme`); process.exit(1); }
  const counts = {};
  model.slides.forEach((s) => s.items.forEach((it) => { if (it.type === 'text') it.paragraph.runs.forEach((run) => { if (!run.br) counts[run.font] = (counts[run.font] || 0) + (run.text || '').length; }); }));
  const faces = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([f]) => f);
  let built;
  try {
    built = buildPptx(model, { title: r.title, fontMajor: faces[0] || 'Arial', fontMinor: faces[0] || 'Arial', scheme: THEME_SCHEMES[themeName], plainFaces: true, presetDashes: true, baselineRule: GSLIDES_BASELINE });
  } catch (e) { console.error('export-gslides ERROR: ' + (e.stack || e.message)); process.exit(1); }

  // ── 3. upload + convert, then correct through the Slides API ──
  const work = mkdtempSync(join(tmpdir(), 'nbg-gslides-'));
  const name = args.name || r.title || basename(deck).replace(/\.html?$/i, '');
  let id, fix;
  try {
    const pptx = join(work, 'deck.pptx');
    writeFileSync(pptx, built.buf);
    if (args.pptx) { const keep = resolve(process.cwd(), args.pptx); mkdirSync(dirname(keep), { recursive: true }); copyFileSync(pptx, keep); }
    ({ id } = uploadPptxAsSlides(gws, pptx, { name, folder: args.folder, timeout: args.timeout }));
    const pres = getPresentation(gws, id, args.timeout);
    fix = fontRequests(model, pres);
    if (fix.reqs.length) batchUpdate(gws, id, fix.reqs, args.timeout);
  } catch (e) {
    console.error('export-gslides ERROR: ' + e.message + (id ? `\n  (the presentation was created: ${slidesUrl(id)})` : ''));
    process.exit(1);
  } finally { rmSync(work, { recursive: true, force: true }); }

  const c = { text: 0, shape: 0, image: 0, line: 0 };
  model.slides.forEach((s) => s.items.forEach((it) => { c[it.type]++; }));
  console.log(`\nNBG deck → Google Slides — "${name}" (${user || 'signed-in account'})`);
  console.log(`  ${slidesUrl(id)}`);
  console.log(`  slides: ${model.slides.length} | text boxes: ${c.text} | shapes: ${c.shape + c.line} | pictures: ${c.image} | line breaks: ${args.reflow ? 'Slides reflows' : "Chrome's kept"}`);
  console.log(`  typefaces in Slides: ${faces.join(', ')}`);
  for (const [k, v] of fonts.substitutions) console.log(`    ${k}  (${v} run${v > 1 ? 's' : ''})`);
  if (fonts.unknown.size) console.log(`  ! not in Slides and no substitute known — drawn in Arial: ${[...fonts.unknown].join(', ')}`);
  if (raised) console.log(`  raised runs set as boxes of their own: ${raised}`);
  if (blended) console.log(`  translucent text: ${blended} run(s) blended with their backdrop (Slides has no text transparency)`);
  console.log(`  weights set through the Slides API: ${fix.reqs.length} run(s)${fix.mismatched || fix.missing ? ` — ${fix.mismatched + fix.missing} text box(es) left as imported` : ''}`);
  model.warnings.forEach((w) => console.log(`  ! ${w.msg}${w.count > 1 ? ` (${w.count}x)` : ''}`));

  if (args.check) {
    const cmp = spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'compare-pptx.mjs'), deck, id, '-o', resolve(process.cwd(), args.check), ...(args.gws ? ['--gws', args.gws] : []), ...(args.browser ? ['--browser', args.browser] : [])], { stdio: 'inherit' });
    if (cmp.status !== 0) process.exit(1);
  } else {
    console.log(`\nNow check it: node compare-pptx.mjs <deck.html> ${id} -o <dir> — READ the slide-NN.png files.\n`);
  }
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
