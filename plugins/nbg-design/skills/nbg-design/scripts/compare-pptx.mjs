#!/usr/bin/env node
// NBG Design — check an exported .pptx against its HTML deck, slide by slide.
//
//   1. the deck's slides are captured in headless Chrome at their native artboard size (the
//      print-layout shim export-pdf.mjs and export-pptx.mjs use);
//   2. the .pptx is rendered to PDF — by Microsoft PowerPoint itself on macOS (--renderer powerpoint,
//      AppleScript "save as PDF"; the default when PowerPoint is installed) or by LibreOffice
//      (--renderer libreoffice: soffice --headless --convert-to pdf) or by Google Slides (--renderer google:
//      uploaded and converted by Drive, exported as PDF, the temporary copy deleted; or pass a Google
//      Slides presentation URL / id instead of the .pptx to check that presentation as it is) — and the
//      pages rasterised by poppler (pdftoppm) at the artboard's pixel size;
//   3. inside the browser (canvas, no image library) each pair is compared and drawn as one PNG
//      per slide: HTML | PowerPoint | difference map (red = differs), with a score per slide —
//      the share of pixels that differ clearly (|Δ| > 48 on any channel), after a 3x3 erosion so
//      anti-aliasing seams do not count.
//
// Either renderer draws with the fonts installed on this host. A face the deck uses but the host
// lacks is substituted and shows up as a text difference that PowerPoint on a machine with the
// font would not have: install the deck's fonts, or pass --fonts <dir> with their .ttf/.otf files
// (they are given to LibreOffice through a throw-away profile; nothing is installed).
//
// Zero dependencies. Node >= 18. Needs a browser, PowerPoint (macOS) or LibreOffice, and poppler (pdftoppm).
// Exit: 0 = compared, 1 = error, 3 = a required program is missing.

import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, copyFileSync, rmSync } from 'node:fs';
import { resolve, dirname, basename, join, extname } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { findBrowser, NO_BROWSER_EXIT_CODE } from './lib/find-browser.mjs';
import { launchBrowser, openPage, navigate, evaluate } from './lib/cdp.mjs';
import { findGws, checkAuth, uploadPptxAsSlides, exportFile, deleteFile, presentationId } from './lib/gslides.mjs';

const PRINT_LAYOUT_SRC = readFileSync(new URL('./lib/print-layout.js', import.meta.url), 'utf8');

const USAGE = `NBG deck ⇄ PowerPoint comparison (needs a browser, LibreOffice and poppler)
Usage: node compare-pptx.mjs <deck.html> <deck.pptx | Google Slides URL or id> [-o <dir>] [--slides 1,2,5]
                             [--renderer powerpoint|libreoffice|google] [--fonts <dir>] [--soffice <path>]
                             [--gws <path>] [--browser <path>] [--timeout <ms>]

  -o, --out          Output directory (default: <deck-name>-pptx-check/ next to the deck).
  --slides           Comma list of 1-based slide numbers (default: all).
  --renderer <name>  powerpoint (macOS, Microsoft PowerPoint through AppleScript), libreoffice, or
                     google (the .pptx uploaded to Google Drive as Google Slides, exported as PDF, the
                     temporary presentation deleted; needs the gws CLI signed in). A Google Slides
                     URL / id as second argument always renders with google.
                     Default: powerpoint when it is installed on this Mac, else libreoffice.
  --gws <path>       Google Workspace CLI binary (else gws on PATH).
  --fonts <dir>      LibreOffice only: folder of .ttf/.otf files for its throw-away profile (honoured
                     on Linux/Windows builds; LibreOffice on macOS reads only installed fonts).
  --soffice <path>   LibreOffice binary (else soffice / libreoffice on PATH, or the macOS app).
  --browser <path>   Explicit browser binary (else auto-detect; or env NBG_BROWSER / CHROME_BIN).
  --timeout <ms>     Timeout of each step (default 240000).
  --keep             Also keep the raw captures (html-N.png, pptx-N.png) in the output directory.

Writes slide-NN.png (HTML | PowerPoint | difference) and report.json. Exit: 0 = compared,
1 = error, 3 = browser / LibreOffice / pdftoppm missing.`;

function parseArgs(argv) {
  const a = { _: [], timeout: 240000 };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '-o' || x === '--out') a.out = argv[++i];
    else if (x === '--slides') a.slides = argv[++i];
    else if (x === '--fonts') a.fonts = argv[++i];
    else if (x === '--renderer') a.renderer = argv[++i];
    else if (x === '--keep') a.keep = true;
    else if (x === '--soffice') a.soffice = argv[++i];
    else if (x === '--gws') a.gws = argv[++i];
    else if (x === '--browser') a.browser = argv[++i];
    else if (x === '--timeout') a.timeout = parseInt(argv[++i], 10);
    else if (x === '-h' || x === '--help') a.help = true;
    else a._.push(x);
  }
  return a;
}

function which(names) {
  for (const n of names) {
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [n], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim().split(/\r?\n/)[0].trim();
  }
  return null;
}
function findSoffice(explicit) {
  if (explicit) return existsSync(explicit) ? explicit : null;
  const onPath = which(['soffice', 'libreoffice']);
  if (onPath) return onPath;
  const mac = '/Applications/LibreOffice.app/Contents/MacOS/soffice';
  if (process.platform === 'darwin' && existsSync(mac)) return mac;
  if (process.platform === 'win32') {
    for (const root of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']].filter(Boolean)) {
      const p = join(root, 'LibreOffice', 'program', 'soffice.exe');
      if (existsSync(p)) return p;
    }
  }
  return null;
}

const POWERPOINT_APP = '/Applications/Microsoft PowerPoint.app';

// LibreOffice: soffice --headless --convert-to pdf, with a throw-away profile (and --fonts in it)
function renderWithLibreOffice(pptx, work, soffice, args) {
  const profile = join(work, 'lo-profile');
  mkdirSync(join(profile, 'user', 'fonts'), { recursive: true });
  if (args.fonts) {
    const fd = resolve(process.cwd(), args.fonts);
    let n = 0;
    for (const f of readdirSync(fd)) if (/\.(ttf|otf|ttc)$/i.test(f)) { copyFileSync(join(fd, f), join(profile, 'user', 'fonts', f)); n++; }
    console.log(`fonts for LibreOffice: ${n} file(s) from ${fd}`);
  }
  const lo = spawnSync(soffice, [`-env:UserInstallation=${pathToFileURL(profile).href}`, '--headless', '--norestore', '--convert-to', 'pdf', '--outdir', work, pptx],
    { encoding: 'utf8', timeout: args.timeout });
  const pdf = join(work, basename(pptx).replace(/\.pptx$/i, '') + '.pdf');
  if (lo.status !== 0 || !existsSync(pdf)) throw new Error(`LibreOffice could not convert the .pptx (${lo.status}): ${(lo.stderr || lo.stdout || '').trim().slice(-400)}`);
  return pdf;
}

// Microsoft PowerPoint (macOS): AppleScript open → save as PDF → close. PowerPoint is sandboxed, so the
// files go through a folder inside its container, removed afterwards.
function renderWithPowerPoint(pptx, work, timeout) {
  const box = join(homedir(), 'Library', 'Containers', 'com.microsoft.Powerpoint', 'Data', `nbg-pptx-check-${process.pid}-${Date.now()}`);
  mkdirSync(box, { recursive: true });
  try {
    const src = join(box, 'deck.pptx'), dst = join(box, 'deck.pdf');
    copyFileSync(pptx, src);
    const script = `with timeout of ${Math.ceil(timeout / 1000)} seconds
tell application "Microsoft PowerPoint"
  open POSIX file ${JSON.stringify(src)}
  set p to active presentation
  save p in POSIX file ${JSON.stringify(dst)} as save as PDF
  close p saving no
end tell
end timeout`;
    const r = spawnSync('osascript', ['-e', script], { encoding: 'utf8', timeout });
    if (r.status !== 0 || !existsSync(dst)) throw new Error(`PowerPoint could not render the .pptx (${r.status}): ${(r.stderr || '').trim().slice(-400)} — try --renderer libreoffice`);
    const pdf = join(work, 'deck.pdf');
    copyFileSync(dst, pdf);
    return pdf;
  } finally { rmSync(box, { recursive: true, force: true }); }
}

// Google Slides: a presentation is exported as PDF by Drive. A .pptx is first uploaded and converted
// (Drive's PowerPoint import, the same one "File → Open" uses), and that temporary copy deleted afterwards.
function renderWithGoogleSlides(gws, id, pptx, work, timeout) {
  checkAuth(gws);
  let temp = null;
  try {
    if (!id) { temp = uploadPptxAsSlides(gws, pptx, { name: `nbg-pptx-check ${basename(pptx)} ${Date.now()}`, timeout }).id; }
    return exportFile(gws, id || temp, 'application/pdf', join(work, 'deck.pdf'), timeout);
  } finally { if (temp) { try { deleteFile(gws, temp); } catch (e) { console.log(`  ! could not delete the temporary presentation ${temp}: ${e.message}`); } } }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length !== 2) { console.log(USAGE); process.exit(args.help ? 0 : 2); }
  const deck = resolve(process.cwd(), args._[0]);
  const remoteId = presentationId(args._[1]);
  const pptx = remoteId ? null : resolve(process.cwd(), args._[1]);
  for (const f of [deck, pptx].filter(Boolean)) if (!existsSync(f)) { console.error('compare-pptx ERROR: not found: ' + f); process.exit(1); }
  const outDir = args.out ? resolve(process.cwd(), args.out) : join(dirname(deck), basename(deck).replace(/\.html?$/i, '') + '-pptx-check');
  mkdirSync(outDir, { recursive: true });

  const browser = findBrowser(args.browser);
  if (browser && browser.error) { console.error('compare-pptx ERROR: ' + browser.error); process.exit(1); }
  const powerpoint = process.platform === 'darwin' && existsSync(POWERPOINT_APP);
  if (args.renderer && !['powerpoint', 'libreoffice', 'google'].includes(args.renderer)) { console.error(`compare-pptx ERROR: unknown --renderer "${args.renderer}"`); process.exit(2); }
  if (remoteId && args.renderer && args.renderer !== 'google') { console.error('compare-pptx ERROR: a Google Slides presentation renders only with --renderer google'); process.exit(2); }
  const renderer = remoteId ? 'google' : args.renderer || (powerpoint ? 'powerpoint' : 'libreoffice');
  const gws = renderer === 'google' ? findGws(args.gws) : null;
  const soffice = renderer === 'libreoffice' ? findSoffice(args.soffice) : null;
  const pdftoppm = which(['pdftoppm']);
  const missing = [!browser && 'a Chrome/Chromium/Edge browser',
    renderer === 'libreoffice' && !soffice && 'LibreOffice (soffice)',
    renderer === 'powerpoint' && !powerpoint && 'Microsoft PowerPoint (macOS)',
    renderer === 'google' && !gws && 'the Google Workspace CLI (gws)',
    !pdftoppm && 'poppler (pdftoppm)'].filter(Boolean);
  if (missing.length) {
    console.error(`compare-pptx: missing ${missing.join(', ')} — the comparison cannot run on this host.`);
    console.error('  Open the .pptx in PowerPoint / Keynote and compare it with the deck by eye instead.');
    process.exit(NO_BROWSER_EXIT_CODE);
  }

  const work = mkdtempSync(join(tmpdir(), 'nbg-pptx-check-'));
  try {
    // ── 1. PowerPoint side: .pptx → PDF ──
    const pdf = renderer === 'powerpoint' ? renderWithPowerPoint(pptx, work, args.timeout)
      : renderer === 'google' ? renderWithGoogleSlides(gws, remoteId, pptx, work, args.timeout)
      : renderWithLibreOffice(pptx, work, soffice, args);
    const rendererName = { powerpoint: 'Microsoft PowerPoint', google: 'Google Slides', libreoffice: 'LibreOffice' }[renderer];

    // ── 2. HTML side: capture each slide ──
    const { cdp, close } = launchBrowser(browser);
    let shots, page;
    try {
      const { sessionId } = await openPage(cdp);
      await navigate(cdp, sessionId, pathToFileURL(deck).href, args.timeout);
      const diag = await evaluate(cdp, sessionId, `(async () => { window.__nbgPdfExternal = true; ${PRINT_LAYOUT_SRC}\n return nbgPreparePrintLayout({ rasterShadows: false }); })()`);
      if (!diag.slides || !diag.page) throw new Error('no slides detected in the deck');
      page = diag.page;
      await new Promise((r) => setTimeout(r, 500));
      const rects = await evaluate(cdp, sessionId, `Array.from(document.querySelectorAll('.nbg-pdf-slide')).map(s => { const r = s.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; })`);
      const wanted = args.slides ? args.slides.split(',').map((n) => parseInt(n, 10)).filter((n) => n >= 1 && n <= rects.length) : rects.map((_, i) => i + 1);
      shots = [];
      for (const n of wanted) {
        const r = rects[n - 1];
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } }, sessionId);
        const f = join(work, `html-${n}.png`);
        writeFileSync(f, Buffer.from(shot.data, 'base64'));
        shots.push({ n, html: f });
      }
      // rasterise the PowerPoint pages at the artboard's pixel size
      const pp = spawnSync(pdftoppm, ['-png', '-scale-to-x', String(page.width), '-scale-to-y', String(page.height), pdf, join(work, 'pptx')], { encoding: 'utf8', timeout: args.timeout });
      if (pp.status !== 0) throw new Error('pdftoppm failed: ' + (pp.stderr || '').trim());
      const pages = readdirSync(work).filter((f) => /^pptx-\d+\.png$/.test(f)).sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
      if (pages.length !== rects.length) console.log(`  ! the .pptx renders ${pages.length} page(s) for ${rects.length} slide(s)`);
      shots.forEach((s) => { s.pptx = pages[s.n - 1] ? join(work, pages[s.n - 1]) : null; });

      // ── 3. compare and compose in the browser ──
      const results = [];
      for (const s of shots) {
        if (!s.pptx) { results.push({ slide: s.n, error: 'no page in the PowerPoint rendering' }); continue; }
        const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff"><canvas id="c"></canvas><script>
          async function load(u){ const i = new Image(); i.src = u; await i.decode(); return i; }
          window.go = async () => {
            const a = await load(${JSON.stringify('data:image/png;base64,' + readFileSync(s.html).toString('base64'))});
            const b = await load(${JSON.stringify('data:image/png;base64,' + readFileSync(s.pptx).toString('base64'))});
            const W = a.width, H = a.height, k = 0.5, w = Math.round(W * k), h = Math.round(H * k), gap = 16, top = 44;
            const ca = new OffscreenCanvas(W, H), xa = ca.getContext('2d'); xa.drawImage(a, 0, 0);
            const cb = new OffscreenCanvas(W, H), xb = cb.getContext('2d'); xb.drawImage(b, 0, 0, W, H);
            const da = xa.getImageData(0, 0, W, H).data, db = xb.getImageData(0, 0, W, H).data;
            const m = new Uint8Array(W * H); let sum = 0;
            for (let i = 0, p = 0; p < W * H; p++, i += 4) {
              const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i+1] - db[i+1]), Math.abs(da[i+2] - db[i+2]));
              sum += d; m[p] = d > 48 ? 1 : 0;
            }
            let solid = 0, any = 0;
            for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
              const p = y * W + x; if (!m[p]) continue; any++;
              if (m[p - 1] && m[p + 1] && m[p - W] && m[p + W]) solid++;
            }
            const cv = document.getElementById('c'); cv.width = w * 3 + gap * 4; cv.height = h + top + gap;
            const g = cv.getContext('2d'); g.fillStyle = '#F2F1EE'; g.fillRect(0, 0, cv.width, cv.height);
            g.drawImage(a, gap, top, w, h); g.drawImage(b, gap * 2 + w, top, w, h);
            const dm = new ImageData(W, H); const dd = dm.data;
            for (let p = 0, i = 0; p < W * H; p++, i += 4) {
              const lum = (da[i] * 0.3 + da[i+1] * 0.59 + da[i+2] * 0.11) * 0.25 + 180;
              if (m[p]) { dd[i] = 230; dd[i+1] = 30; dd[i+2] = 30; } else { dd[i] = dd[i+1] = dd[i+2] = lum; }
              dd[i+3] = 255;
            }
            const cd = new OffscreenCanvas(W, H); cd.getContext('2d').putImageData(dm, 0, 0);
            g.drawImage(cd, gap * 3 + w * 2, top, w, h);
            g.fillStyle = '#0E1726'; g.font = '600 18px Helvetica, Arial, sans-serif';
            g.fillText('Slide ${s.n} — HTML deck', gap, 28); g.fillText(${JSON.stringify(remoteId ? 'Google Slides presentation' : '.pptx rendered by ' + rendererName)}, gap * 2 + w, 28);
            const pct = (solid / (W * H) * 100);
            g.fillText('Difference — ' + pct.toFixed(2) + ' % solid', gap * 3 + w * 2, 28);
            return { mean: sum / (W * H), differing: any / (W * H) * 100, solid: pct, width: cv.width, height: cv.height };
          };</script></body>`;
        const f = join(work, `cmp-${s.n}.html`);
        writeFileSync(f, html);
        await navigate(cdp, sessionId, pathToFileURL(f).href, args.timeout);
        const res = await evaluate(cdp, sessionId, 'window.go()');
        const img = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: res.width, height: res.height, scale: 1 } }, sessionId);
        const outPng = join(outDir, `slide-${String(s.n).padStart(2, '0')}.png`);
        writeFileSync(outPng, Buffer.from(img.data, 'base64'));
        if (args.keep) { copyFileSync(s.html, join(outDir, `html-${s.n}.png`)); copyFileSync(s.pptx, join(outDir, `pptx-${s.n}.png`)); }
        results.push({ slide: s.n, solidDiffPct: +res.solid.toFixed(3), differingPct: +res.differing.toFixed(3), meanDelta: +res.mean.toFixed(2), image: outPng });
      }
      try { await cdp.send('Browser.close'); } catch { /* gone */ }
      writeFileSync(join(outDir, 'report.json'), JSON.stringify({ deck, pptx: pptx || undefined, presentation: remoteId || undefined, renderer: rendererName, slides: results }, null, 1));
      console.log(`\nNBG deck ⇄ PowerPoint comparison — ${outDir}`);
      for (const r of results) {
        if (r.error) { console.log(`  slide ${String(r.slide).padStart(2)}: ${r.error}`); continue; }
        console.log(`  slide ${String(r.slide).padStart(2)}: solid difference ${r.solidDiffPct.toFixed(2).padStart(6)} %   (pixels off: ${r.differingPct.toFixed(2)} %, mean Δ ${r.meanDelta})${r.solidDiffPct > 1.5 ? '   <-- READ' : ''}`);
      }
      console.log(`\nRenderer: ${rendererName}. READ the slide-NN.png files: left the deck, middle the .pptx, right the differences in red.`);
      console.log('Text that differs only by a substituted typeface is a font-installation matter, not a conversion error.\n');
    } finally { close(); }
  } catch (e) {
    console.error('compare-pptx ERROR: ' + e.message);
    process.exitCode = 1;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

main();
