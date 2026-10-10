// NBG Design — PowerPoint (.pptx) writer for export-pptx.mjs. Zero dependencies.
//
// buildPptx(model, opts) turns the slide model of lib/pptx-extract.js (items in CSS px, paint
// order) into an Office Open XML presentation and returns it as a Buffer:
//   - shapes (sp) with preset or custom geometry, solid / gradient fills, outlines, outer shadows;
//   - text boxes (txBox) with real paragraphs and runs: typeface, size, bold, italic, colour,
//     letter-spacing, underline, strike, all-caps, baseline, hyperlinks, exact line spacing;
//   - pictures (pic) with srcRect crops, transparency, rounded / elliptical frames, and SVG
//     pictures (svgBlip extension) with their PNG fallback;
//   - one master, one blank layout, a theme whose fonts are the deck's own, and speaker notes.
// The slide is 13.333 x 7.5 in (PowerPoint's 16:9) for a 1920 x 1080 artboard; other aspect
// ratios keep the width and scale the height. One CSS px = 6350 EMU = 0.5 pt at 1920 px wide.
// The zip container is written here as well (deflate via node:zlib, CRC-32 computed locally).

import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const SLIDE_W_EMU = 12192000;

// Families whose weights are installed as separate named families (Office and desktop installs
// list "Aptos Light", "IBM Plex Sans SemiBold"…). PowerPoint has only a bold flag, so a weight
// other than 400 / 700 is expressed through that family name.
const WEIGHT_NAMES = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 500: 'Medium', 600: 'SemiBold', 800: 'ExtraBold', 900: 'Black' };
const WEIGHTED_FAMILIES = {
  'Aptos': { 300: 'Aptos Light', 600: 'Aptos SemiBold', 800: 'Aptos ExtraBold', 900: 'Aptos Black' },
  'IBM Plex Sans': 'named', 'IBM Plex Mono': 'named', 'IBM Plex Serif': 'named', 'IBM Plex Sans Condensed': 'named',
  'Oswald': 'named', 'Inter': 'named', 'Roboto': 'named', 'Open Sans': 'named', 'Montserrat': 'named', 'Source Sans 3': 'named',
  'Avenir Next': { 100: 'Avenir Next Ultra Light', 200: 'Avenir Next Ultra Light', 300: 'Avenir Next Ultra Light', 500: 'Avenir Next Medium', 600: 'Avenir Next Demi Bold', 800: 'Avenir Next Heavy', 900: 'Avenir Next Heavy' },
  'Helvetica Neue': { 100: 'Helvetica Neue Thin', 200: 'Helvetica Neue UltraLight', 300: 'Helvetica Neue Light', 500: 'Helvetica Neue Medium', 600: 'Helvetica Neue Medium' },
  'Segoe UI': { 300: 'Segoe UI Light', 600: 'Segoe UI Semibold', 100: 'Segoe UI Light', 200: 'Segoe UI Light', 900: 'Segoe UI Black' },
};

/** Typeface + bold flag for a CSS family and weight. */
export function typefaceFor(family, weight) {
  const w = Math.round((weight || 400) / 100) * 100;
  const table = WEIGHTED_FAMILIES[family];
  if (w === 400 || w === 700 || !table) return { face: family, bold: w >= 600 };
  if (table === 'named') {
    if (w === 500 || w === 600 || w <= 300) return { face: `${family} ${WEIGHT_NAMES[w]}`, bold: false };
    return { face: family, bold: true };   // 800 / 900: bold
  }
  if (table[w]) return { face: table[w], bold: false };
  return { face: family, bold: w >= 600 };
}

// PowerPoint's first-line baseline, measured from the top of a text box with zero insets and a line
// pitch of L px (written as a percentage, see text()): 0.75 L, plus a per-face offset in em (calibrated
// against PowerPoint 16 for Mac with the workspace's test_scripts/pptx-baseline-calibration.mjs, one face
// per run — faces whose ascent metrics PowerPoint reads differently from Chrome).
const SHADOW_BLUR_SCALE = 1.35;
const BASELINE_EM = { 'Arial': 0.04, 'Avenir Next': -0.024, 'Courier New': -0.022 };
export function pptBaseline(L, size, family) {
  const base = String(family || '').replace(/ (Thin|ExtraLight|Light|Medium|SemiBold|Semibold|ExtraBold|Black)$/, '');
  return 0.75 * L + (BASELINE_EM[base] != null ? BASELINE_EM[base] : 0.01) * size;
}

// ───────────────────────────── XML helpers ─────────────────────────────

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // characters XML 1.0 forbids
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '');
const hex = (c) => [c.r, c.g, c.b].map((v) => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0')).join('').toUpperCase();
const clr = (c) => {
  const a = Math.round(Math.max(0, Math.min(1, c.a)) * 100000);
  return `<a:srgbClr val="${hex(c)}">${a < 100000 ? `<a:alpha val="${a}"/>` : ''}</a:srgbClr>`;
};
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

// ───────────────────────────── slide content ─────────────────────────────

class SlideWriter {
  constructor(pkg, index, scale) {
    this.pkg = pkg; this.index = index; this.k = scale;   // EMU per px
    this.ptPerPx = scale / 12700;
    this.id = 2; this.rels = [{ id: 'rId1', type: 'slideLayout', target: '../slideLayouts/slideLayout1.xml' }];
    this.parts = [];
  }
  emu(v) { return Math.round(v * this.k); }
  rel(type, target, external) {
    const id = `rId${this.rels.length + 1}`;
    this.rels.push({ id, type, target, external });
    return id;
  }
  xfrm(it, flip) {
    const rot = it.rot ? ` rot="${Math.round((((it.rot % 360) + 360) % 360) * 60000)}"` : '';
    return `<a:xfrm${rot}${flip || ''}><a:off x="${this.emu(it.x)}" y="${this.emu(it.y)}"/><a:ext cx="${Math.max(1, this.emu(it.w))}" cy="${Math.max(1, this.emu(it.h))}"/></a:xfrm>`;
  }
  geom(g, w, h) {
    if (!g || g.prst === 'rect') return '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
    if (g.prst === 'ellipse') return '<a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom>';
    if (g.prst === 'roundRect') return `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${g.adj}"/></a:avLst></a:prstGeom>`;
    // per-corner radii [[rx,ry] TL, TR, BR, BL] → custom path in EMU
    const W = Math.max(1, this.emu(w)), H = Math.max(1, this.emu(h));
    const r = g.path.map(([x, y]) => [Math.min(this.emu(x), W) | 0, Math.min(this.emu(y), H) | 0]);   // radii already scaled to fit (CSS rules)
    const [tl, tr, br, bl] = r;
    const arc = (rx, ry, st) => (rx && ry ? `<a:arcTo wR="${rx}" hR="${ry}" stAng="${st}" swAng="5400000"/>` : '');
    return `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="${W}" h="${H}">` +
      `<a:moveTo><a:pt x="${tl[0]}" y="0"/></a:moveTo><a:lnTo><a:pt x="${W - tr[0]}" y="0"/></a:lnTo>${arc(tr[0], tr[1], 16200000)}` +
      `<a:lnTo><a:pt x="${W}" y="${H - br[1]}"/></a:lnTo>${arc(br[0], br[1], 0)}` +
      `<a:lnTo><a:pt x="${bl[0]}" y="${H}"/></a:lnTo>${arc(bl[0], bl[1], 5400000)}` +
      `<a:lnTo><a:pt x="0" y="${tl[1]}"/></a:lnTo>${arc(tl[0], tl[1], 10800000)}<a:close/></a:path></a:pathLst></a:custGeom>`;
  }
  fill(f) {
    if (!f) return '<a:noFill/>';
    if (f.solid) return `<a:solidFill>${clr(f.solid)}</a:solidFill>`;
    if (f.grad) {
      const g = f.grad;
      const gs = g.stops.map((s) => `<a:gs pos="${Math.round(s.pos * 100000)}">${clr(s.c)}</a:gs>`).join('');
      // CSS: 0deg points up, 90deg right, clockwise. DrawingML lin: 0 = left→right, clockwise.
      const shade = g.kind === 'radial'
        ? '<a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path>'
        : `<a:lin ang="${Math.round(((((g.angle - 90) % 360) + 360) % 360) * 60000)}" scaled="0"/>`;
      return `<a:gradFill rotWithShape="1"><a:gsLst>${gs}</a:gsLst>${shade}</a:gradFill>`;
    }
    return '<a:noFill/>';
  }
  line(l) {
    if (!l) return '<a:ln><a:noFill/></a:ln>';
    // Chrome draws a dashed border as ~2.75 w dashes and ~2.5 w gaps (measured); PowerPoint's preset "dash" is 4 w / 3 w
    const dash = l.dash === 'dash' ? '<a:custDash><a:ds d="275000" sp="250000"/></a:custDash>' : l.dash ? `<a:prstDash val="${l.dash}"/>` : '';
    return `<a:ln w="${Math.max(1, this.emu(l.w))}"><a:solidFill>${clr(l.color)}</a:solidFill>${dash}<a:miter lim="800000"/></a:ln>`;
  }
  effects(sh, w, h) {
    if (!sh) return '';
    const dist = this.emu(Math.hypot(sh.x, sh.y));
    const dir = Math.round(((Math.atan2(sh.y, sh.x) * 180 / Math.PI + 360) % 360) * 60000);
    // PowerPoint's blur falls off faster than a CSS blur of the same radius (measured: ~0.75), and has
    // no spread: the shadow is scaled about the centre by (side + 2 spread) / side instead
    const blur = this.emu(sh.blur * SHADOW_BLUR_SCALE);
    const sx = sh.spread && w > 0 ? ` sx="${Math.round((w + 2 * sh.spread) / w * 100000)}"` : '';
    const sy = sh.spread && h > 0 ? ` sy="${Math.round((h + 2 * sh.spread) / h * 100000)}"` : '';
    return `<a:effectLst><a:outerShdw blurRad="${blur}" dist="${dist}" dir="${dir}"${sx}${sy} algn="ctr" rotWithShape="0">${clr(sh.color)}</a:outerShdw></a:effectLst>`;
  }

  shape(it) {
    const id = this.id++;
    this.parts.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Shape ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
      `<p:spPr>${this.xfrm(it)}${this.geom(it.geom, it.w, it.h)}${this.fill(it.fill)}${this.line(it.line)}${this.effects(it.shadow, it.w, it.h)}</p:spPr>` +
      `<p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p></p:txBody></p:sp>`);
  }

  lineShape(it) {
    const id = this.id++;
    const x = Math.min(it.x1, it.x2), y = Math.min(it.y1, it.y2);
    const flip = (it.x2 < it.x1 ? ' flipH="1"' : '') + (it.y2 < it.y1 ? ' flipV="1"' : '');
    const box = { x, y, w: Math.abs(it.x2 - it.x1), h: Math.abs(it.y2 - it.y1) };
    this.parts.push(`<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="Line ${id}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr>` +
      `<p:spPr>${this.xfrm(box, flip)}<a:prstGeom prst="line"><a:avLst/></a:prstGeom>${this.line(it.line)}</p:spPr></p:cxnSp>`);
  }

  picture(it) {
    if (!it.src) return;
    const media = this.pkg.media(it.src);
    if (!media) return;
    const rid = this.rel('image', `../media/${media}`);
    let svgExt = '';
    if (it.svg) {
      const svgName = this.pkg.mediaBytes(Buffer.from(it.svg, 'utf8'), 'svg');
      const sid = this.rel('image', `../media/${svgName}`);
      svgExt = `<a:extLst><a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}"><asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="${sid}"/></a:ext></a:extLst>`;
    }
    const alpha = it.alpha != null && it.alpha < 0.999 ? `<a:alphaModFix amt="${Math.round(it.alpha * 100000)}"/>` : '';
    const c = it.crop;
    const pc = (v) => Math.round((v || 0) * 100000);
    const crop = c && (Math.abs(c.l) > 1e-4 || Math.abs(c.t) > 1e-4 || Math.abs(c.r) > 1e-4 || Math.abs(c.b) > 1e-4)
      ? `<a:srcRect l="${pc(c.l)}" t="${pc(c.t)}" r="${pc(c.r)}" b="${pc(c.b)}"/>` : '<a:srcRect/>';
    const id = this.id++;
    this.parts.push(`<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="Picture ${id}" descr="${esc(it.descr || '')}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>` +
      `<p:blipFill><a:blip r:embed="${rid}">${alpha}${svgExt}</a:blip>${crop}<a:stretch><a:fillRect/></a:stretch></p:blipFill>` +
      `<p:spPr>${this.xfrm(it)}${this.geom(it.geom, it.w, it.h)}${this.effects(it.shadow, it.w, it.h)}</p:spPr></p:pic>`);
  }

  text(it) {
    const id = this.id++;
    const p = it.paragraph;
    const algn = { left: 'l', center: 'ctr', right: 'r', justify: 'just' }[it.align] || 'l';
    // line pitch as a percentage: PowerPoint rounds exact spacing (spcPts) to whole points — 2 px at this
    // scale, an error that adds up over a long block — while 100 % is exactly 1.2 x the largest font size of
    // the line for every face (measured), and percentages are not rounded
    const lineSize = Math.max(...p.runs.filter((r) => !r.br && !r.baseline).map((r) => r.size), 0) || it.firstSize || it.fontSize;
    const lnSpc = it.lineHeight ? `<a:lnSpc><a:spcPct val="${Math.max(1000, Math.round(it.lineHeight / (1.2 * lineSize) * 100000))}"/></a:lnSpc>` : '';
    let bullet = '<a:buNone/>', marL = '';
    if (it.bullet) {
      const ind = this.emu(it.bullet.indent);
      marL = ` marL="${ind}" indent="${-ind}"`;
      const t = it.bullet.type;
      const num = { decimal: 'arabicPeriod', 'lower-alpha': 'alphaLcPeriod', 'upper-alpha': 'alphaUcPeriod', 'lower-roman': 'romanLcPeriod', 'upper-roman': 'romanUcPeriod', 'lower-latin': 'alphaLcPeriod', 'upper-latin': 'alphaUcPeriod' }[t];
      const ch = { disc: '•', circle: '◦', square: '▪' }[t] || '•';
      bullet = (it.bullet.color ? `<a:buClr>${clr(it.bullet.color)}</a:buClr>` : '') +
        (num ? `<a:buFont typeface="+mj-lt"/><a:buAutoNum type="${num}" startAt="${it.bullet.index}"/>` : `<a:buFont typeface="Arial"/><a:buChar char="${ch}"/>`);
    }
    const runs = p.runs.map((r) => (r.br ? `<a:br>${this.rPr(r, 'a:rPr')}</a:br>` : `<a:r>${this.rPr(r, 'a:rPr')}<a:t>${esc(r.text)}</a:t></a:r>`)).join('');
    const last = p.runs.filter((r) => !r.br).slice(-1)[0];
    const wrap = it.wrap ? 'square' : 'none';
    // PowerPoint puts the first baseline at 0.75 x the exact line spacing (+ a per-face offset):
    // move the box so that baseline lands on Chrome's (see pptBaseline)
    let box = it;
    if (it.baseline != null && it.lineHeight && !it.rot) {
      const firstRun = p.runs.find((r) => !r.br) || p.runs[0];
      const y = it.baseline - pptBaseline(it.lineHeight, it.firstSize || firstRun.size, firstRun.font);
      box = { ...it, y, h: it.h + (it.y - y) };
    }
    this.parts.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>` +
      `<p:spPr>${this.xfrm(box)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>` +
      `<p:txBody><a:bodyPr wrap="${wrap}" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="${it.valign || 't'}" anchorCtr="0"><a:noAutofit/></a:bodyPr><a:lstStyle/>` +
      `<a:p><a:pPr algn="${algn}"${marL}>${lnSpc}<a:spcBef><a:spcPts val="0"/></a:spcBef><a:spcAft><a:spcPts val="0"/></a:spcAft>${bullet}</a:pPr>${runs}` +
      `${last ? this.rPr(last, 'a:endParaRPr') : ''}</a:p></p:txBody></p:sp>`);
  }

  rPr(r, tag) {
    const { face, bold } = typefaceFor(r.font, r.weight);
    this.pkg.useFont(face);
    const lang = /[Ͱ-Ͽἀ-῿]/.test(r.text || '') ? 'el-GR' : 'en-US';
    // kern: the smallest size kerned (hundredths of a pt); without it PowerPoint does not kern at all, Chrome always does
    // PowerPoint draws a run with a baseline offset at 2/3 of its size (superscript style): compensate
    const size = r.baseline ? r.size * 1.5 : r.size;
    const attrs = [`lang="${lang}"`, 'kern="100"', `sz="${Math.max(100, Math.min(400000, Math.round(size * this.ptPerPx * 100)))}"`];
    if (bold) attrs.push('b="1"'); else attrs.push('b="0"');
    if (r.italic) attrs.push('i="1"');
    if (r.underline) attrs.push('u="sng"');
    if (r.strike) attrs.push('strike="sngStrike"');
    if (r.caps) attrs.push(`cap="${r.caps}"`);
    if (r.spacing) attrs.push(`spc="${Math.round(r.spacing * this.ptPerPx * 100)}"`);
    // the offset is a percentage of the (enlarged) sz: measured shift / drawn size
    if (r.baseline) attrs.push(`baseline="${Math.round(r.baseline * 1000 / 1.5)}"`);
    attrs.push('dirty="0"');
    let link = '';
    if (r.link && tag === 'a:rPr' && /^(https?:|mailto:)/i.test(r.link)) {
      link = `<a:hlinkClick r:id="${this.rel('hyperlink', r.link, true)}"/>`;
    }
    return `<${tag} ${attrs.join(' ')}><a:solidFill>${clr(r.color)}</a:solidFill><a:latin typeface="${esc(face)}"/><a:ea typeface="${esc(face)}"/><a:cs typeface="${esc(face)}"/>${link}</${tag}>`;
  }

  xml(slide) {
    for (const it of slide.items) {
      if (it.type === 'shape') this.shape(it);
      else if (it.type === 'line') this.lineShape(it);
      else if (it.type === 'image') this.picture(it);
      else if (it.type === 'text') this.text(it);
    }
    const bg = slide.background ? `<p:bg><p:bgPr><a:solidFill>${clr({ ...slide.background, a: 1 })}</a:solidFill><a:effectLst/></p:bgPr></p:bg>` : '';
    return `${XML}<p:sld ${NS}><p:cSld>${bg}<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
      `<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>` +
      `${this.parts.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
  }
  relsXml() { return relsXml(this.rels); }
}

const REL_TYPES = {
  slideLayout: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout',
  slideMaster: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster',
  slide: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide',
  theme: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme',
  image: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
  hyperlink: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
  notesSlide: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide',
  notesMaster: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster',
  presProps: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps',
  viewProps: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps',
  tableStyles: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles',
  officeDocument: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument',
  coreProps: 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties',
  extProps: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties',
};
function relsXml(rels) {
  return `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    rels.map((r) => `<Relationship Id="${r.id}" Type="${REL_TYPES[r.type]}" Target="${esc(r.target)}"${r.external ? ' TargetMode="External"' : ''}/>`).join('') +
    '</Relationships>';
}

// ───────────────────────────── package ─────────────────────────────

class Package {
  constructor() { this.files = new Map(); this.mediaByHash = new Map(); this.mediaCount = 0; this.fonts = new Map(); this.exts = new Set(); }
  add(name, data) { this.files.set(name, Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')); }
  useFont(f) { this.fonts.set(f, (this.fonts.get(f) || 0) + 1); }
  media(dataUrl) {
    const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(dataUrl);
    if (!m) return null;
    const mime = m[1].toLowerCase();
    const buf = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]), 'utf8');
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/jpg': 'jpeg', 'image/gif': 'gif', 'image/svg+xml': 'svg' }[mime];
    if (!ext) return null;
    return this.mediaBytes(buf, ext);
  }
  mediaBytes(buf, ext) {
    const h = createHash('sha1').update(buf).digest('hex');
    if (this.mediaByHash.has(h)) return this.mediaByHash.get(h);
    const name = `image${++this.mediaCount}.${ext}`;
    this.add(`ppt/media/${name}`, buf);
    this.exts.add(ext);
    this.mediaByHash.set(h, name);
    return name;
  }
}

/**
 * Build the .pptx. model = { width, height, slides:[{ background, items, notes }] } (CSS px).
 * opts = { title, author, fontMajor, fontMinor, scheme: { dk1, lt1, dk2, lt2, accents } }. Returns { buf, fonts, media }.
 */
export function buildPptx(model, opts = {}) {
  const pkg = new Package();
  const k = SLIDE_W_EMU / model.width;
  const cx = SLIDE_W_EMU, cy = Math.round(model.height * k);
  const n = model.slides.length;
  const hasNotes = model.slides.some((s) => s.notes);

  model.slides.forEach((s, i) => {
    const w = new SlideWriter(pkg, i + 1, k);
    const xml = w.xml(s);
    if (s.notes) w.rels.push({ id: `rId${w.rels.length + 1}`, type: 'notesSlide', target: `../notesSlides/notesSlide${i + 1}.xml` });
    pkg.add(`ppt/slides/slide${i + 1}.xml`, xml);
    pkg.add(`ppt/slides/_rels/slide${i + 1}.xml.rels`, w.relsXml());
    if (s.notes) {
      pkg.add(`ppt/notesSlides/notesSlide${i + 1}.xml`, notesSlideXml(s.notes));
      pkg.add(`ppt/notesSlides/_rels/notesSlide${i + 1}.xml.rels`, relsXml([
        { id: 'rId1', type: 'notesMaster', target: '../notesMasters/notesMaster1.xml' },
        { id: 'rId2', type: 'slide', target: `../slides/slide${i + 1}.xml` }]));
    }
  });

  const major = opts.fontMajor || 'Arial', minor = opts.fontMinor || major;
  pkg.add('ppt/theme/theme1.xml', themeXml(major, minor, opts.scheme));
  pkg.add('ppt/slideMasters/slideMaster1.xml', masterXml());
  pkg.add('ppt/slideMasters/_rels/slideMaster1.xml.rels', relsXml([
    { id: 'rId1', type: 'slideLayout', target: '../slideLayouts/slideLayout1.xml' },
    { id: 'rId2', type: 'theme', target: '../theme/theme1.xml' }]));
  pkg.add('ppt/slideLayouts/slideLayout1.xml', layoutXml());
  pkg.add('ppt/slideLayouts/_rels/slideLayout1.xml.rels', relsXml([{ id: 'rId1', type: 'slideMaster', target: '../slideMasters/slideMaster1.xml' }]));
  if (hasNotes) {
    pkg.add('ppt/theme/theme2.xml', themeXml(major, minor, opts.scheme));
    pkg.add('ppt/notesMasters/notesMaster1.xml', notesMasterXml());
    pkg.add('ppt/notesMasters/_rels/notesMaster1.xml.rels', relsXml([{ id: 'rId1', type: 'theme', target: '../theme/theme2.xml' }]));
  }

  const presRels = [{ id: 'rId1', type: 'slideMaster', target: 'slideMasters/slideMaster1.xml' }];
  for (let i = 1; i <= n; i++) presRels.push({ id: `rId${i + 1}`, type: 'slide', target: `slides/slide${i}.xml` });
  let r = n + 2;
  const notesRid = hasNotes ? `rId${r++}` : null;
  if (hasNotes) presRels.push({ id: notesRid, type: 'notesMaster', target: 'notesMasters/notesMaster1.xml' });
  presRels.push({ id: `rId${r++}`, type: 'presProps', target: 'presProps.xml' });
  presRels.push({ id: `rId${r++}`, type: 'viewProps', target: 'viewProps.xml' });
  presRels.push({ id: `rId${r++}`, type: 'theme', target: 'theme/theme1.xml' });
  presRels.push({ id: `rId${r++}`, type: 'tableStyles', target: 'tableStyles.xml' });
  pkg.add('ppt/_rels/presentation.xml.rels', relsXml(presRels));
  pkg.add('ppt/presentation.xml', `${XML}<p:presentation ${NS} saveSubsetFonts="1">` +
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
    (hasNotes ? `<p:notesMasterIdLst><p:notesMasterId r:id="${notesRid}"/></p:notesMasterIdLst>` : '') +
    `<p:sldIdLst>${model.slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('')}</p:sldIdLst>` +
    `<p:sldSz cx="${cx}" cy="${cy}"/><p:notesSz cx="6858000" cy="9144000"/>` +
    `<p:defaultTextStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr><a:lvl1pPr marL="0" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl1pPr></p:defaultTextStyle>` +
    '</p:presentation>');
  pkg.add('ppt/presProps.xml', `${XML}<p:presentationPr ${NS}/>`);
  pkg.add('ppt/viewProps.xml', `${XML}<p:viewPr ${NS}><p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr><p:gridSpacing cx="76200" cy="76200"/></p:viewPr>`);
  pkg.add('ppt/tableStyles.xml', `${XML}<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`);

  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  pkg.add('docProps/core.xml', `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:title>${esc(opts.title || 'Presentation')}</dc:title><dc:creator>${esc(opts.author || 'NBG Design')}</dc:creator>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`);
  pkg.add('docProps/app.xml', `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>NBG Design export-pptx</Application><Slides>${n}</Slides><PresentationFormat>Custom</PresentationFormat></Properties>`);
  pkg.add('_rels/.rels', relsXml([
    { id: 'rId1', type: 'officeDocument', target: 'ppt/presentation.xml' },
    { id: 'rId2', type: 'coreProps', target: 'docProps/core.xml' },
    { id: 'rId3', type: 'extProps', target: 'docProps/app.xml' }]));

  const ct = [`${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>'];
  const mimes = { png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml' };
  for (const e of pkg.exts) ct.push(`<Default Extension="${e}" ContentType="${mimes[e]}"/>`);
  const over = (part, type) => ct.push(`<Override PartName="/${part}" ContentType="application/vnd.openxmlformats-officedocument.${type}"/>`);
  over('ppt/presentation.xml', 'presentationml.presentation.main+xml');
  over('ppt/slideMasters/slideMaster1.xml', 'presentationml.slideMaster+xml');
  over('ppt/slideLayouts/slideLayout1.xml', 'presentationml.slideLayout+xml');
  for (let i = 1; i <= n; i++) over(`ppt/slides/slide${i}.xml`, 'presentationml.slide+xml');
  over('ppt/theme/theme1.xml', 'theme+xml');
  if (hasNotes) {
    over('ppt/theme/theme2.xml', 'theme+xml');
    over('ppt/notesMasters/notesMaster1.xml', 'presentationml.notesMaster+xml');
    model.slides.forEach((s, i) => { if (s.notes) over(`ppt/notesSlides/notesSlide${i + 1}.xml`, 'presentationml.notesSlide+xml'); });
  }
  over('ppt/presProps.xml', 'presentationml.presProps+xml');
  over('ppt/viewProps.xml', 'presentationml.viewProps+xml');
  over('ppt/tableStyles.xml', 'presentationml.tableStyles+xml');
  ct.push('<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>');
  over('docProps/app.xml', 'extended-properties+xml');
  ct.push('</Types>');
  pkg.add('[Content_Types].xml', ct.join(''));

  // [Content_Types].xml first, as Office writes it
  const order = ['[Content_Types].xml', '_rels/.rels', ...[...pkg.files.keys()].filter((f) => f !== '[Content_Types].xml' && f !== '_rels/.rels')];
  const buf = zip(order.map((name) => ({ name, data: pkg.files.get(name) })));
  return { buf, fonts: [...pkg.fonts.keys()], media: pkg.mediaCount };
}

// ───────────────────────────── fixed parts ─────────────────────────────

function masterXml() {
  const lvl = (i) => `<a:lvl${i}pPr marL="0" algn="l" rtl="0"><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl${i}pPr>`;
  return `${XML}<p:sldMaster ${NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>' +
    '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
    '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
    `<p:txStyles><p:titleStyle>${lvl(1)}</p:titleStyle><p:bodyStyle>${lvl(1)}</p:bodyStyle><p:otherStyle>${lvl(1)}</p:otherStyle></p:txStyles></p:sldMaster>`;
}
function layoutXml() {
  return `${XML}<p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>' +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>';
}
function notesMasterXml() {
  return `${XML}<p:notesMaster ${NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldImg" idx="2"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="381000" y="685800"/><a:ext cx="6096000" cy="3429000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:sp>' +
    '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" sz="quarter" idx="3"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="685800" y="4343400"/><a:ext cx="5486400" cy="4114800"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>' +
    '</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:notesMaster>';
}
function notesSlideXml(text) {
  const paras = String(text).split(/\n+/).map((l) => `<a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${esc(l)}</a:t></a:r></a:p>`).join('');
  return `${XML}<p:notes ${NS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp>' +
    `<p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${paras}</p:txBody></p:sp>` +
    '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>';
}

function themeXml(major, minor, scheme) {
  // scheme: { dk1, lt1, dk2, lt2, accents: [6 hex] } — the deck theme's palette in PowerPoint's colour picker
  const s = scheme || { dk1: '0A1416', lt1: 'FFFFFF', dk2: '003841', lt2: 'F5F8F6', accents: ['007B85', '003841', '00ADBF', '00CFE7', '5B6B6D', '0A1416'] };
  const h = (v) => String(v).replace('#', '').toUpperCase();
  const p = s.accents.map(h);
  const font = (f) => `<a:latin typeface="${esc(f)}"/><a:ea typeface=""/><a:cs typeface=""/>`;
  const style = (w) => `<a:ln w="${w}" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>`;
  return `${XML}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="NBG Design"><a:themeElements>` +
    `<a:clrScheme name="NBG Design"><a:dk1><a:srgbClr val="${h(s.dk1)}"/></a:dk1><a:lt1><a:srgbClr val="${h(s.lt1)}"/></a:lt1><a:dk2><a:srgbClr val="${h(s.dk2)}"/></a:dk2><a:lt2><a:srgbClr val="${h(s.lt2)}"/></a:lt2>` +
    p.slice(0, 6).map((h, i) => `<a:accent${i + 1}><a:srgbClr val="${h}"/></a:accent${i + 1}>`).join('') +
    `<a:hlink><a:srgbClr val="${p[0]}"/></a:hlink><a:folHlink><a:srgbClr val="${h(s.dk2)}"/></a:folHlink></a:clrScheme>` +
    `<a:fontScheme name="NBG Design"><a:majorFont>${font(major)}</a:majorFont><a:minorFont>${font(minor)}</a:minorFont></a:fontScheme>` +
    '<a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>' +
    `<a:lnStyleLst>${style(6350)}${style(12700)}${style(19050)}</a:lnStyleLst>` +
    '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
    '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>' +
    '</a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>';
}

// ───────────────────────────── zip ─────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/** Minimal zip writer (deflate, no zip64): entries = [{ name, data: Buffer }]. */
export function zip(entries) {
  const chunks = [], central = [];
  let offset = 0;
  const dosTime = 0, dosDate = (2026 - 1980) << 9 | 1 << 5 | 1;   // fixed timestamp: reproducible output
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    // already-compressed media is stored; everything else deflated
    const store = /\.(png|jpe?g|gif)$/i.test(e.name);
    const body = store ? e.data : deflateRawSync(e.data, { level: 9 });
    const crc = crc32(e.data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(store ? 0 : 8, 8);
    lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(e.data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    chunks.push(lh, name, body);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(store ? 0 : 8, 10);
    ch.writeUInt16LE(dosTime, 12); ch.writeUInt16LE(dosDate, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20);
    ch.writeUInt32LE(e.data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
    central.push(ch, name);
    offset += lh.length + name.length + body.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, cd, end]);
}
