// NBG Design — the typefaces Google Slides can draw, and the substitutes export-gslides.mjs names for
// the ones it cannot.
//
// Google Slides renders only its own font list: the Google Fonts library plus a few licensed faces. A
// .pptx face outside that list is silently replaced on import (Aptos → Arial, Segoe UI → Quattrocento
// Sans, Avenir Next → Avenir in two weights only), so the exporter chooses the replacement itself:
//   1. the face Chrome actually drew the run with (an Office face the browser lacks was drawn with the
//      stack's next face — that is what the HTML shows on this machine);
//   2. kept when Slides has it (SLIDES_FACES, or a Google Fonts family — checked on fonts.googleapis.com);
//   3. otherwise its substitute from SUBSTITUTES — the closest Google Fonts face, chosen by measurement
//      (the workspace's test_scripts/gslides-font-match.mjs: advance width, x-height, glyph shape, Greek).

// Licensed / system faces Slides draws (probed: a presentation of each face exported to PDF names it), with
// the weights it has where not every weight exists. Google Fonts families are recognised online.
// Through the API Slides draws weights up to 700 correctly: 800 / 900 (bold) are drawn but spaced as 700.
export const SLIDES_FACES = {
  'Arial': null, 'Helvetica Neue': [300, 400, 700], 'Calibri': [400, 700], 'Cambria': [400, 700], 'Consolas': [400, 700],
  'Georgia': [400, 700], 'Verdana': [400, 700], 'Tahoma': [400, 700], 'Trebuchet MS': [400, 700], 'Times New Roman': [400, 700],
  'Courier New': [400, 700], 'Gill Sans': [400, 700], 'Palatino': [400, 700], 'Comic Sans MS': [400, 700], 'Impact': [400],
};

// face → [Google Fonts substitute, why, optional { weight: [family, weight] }]. Measured with
// gslides-font-match.mjs (advance width, x-height, glyph IoU, stroke ink area — at each weight): where the
// substitute's same weight is visibly heavier or lighter, the table gives the weight (and face) that matches.
export const SUBSTITUTES = {
  'Aptos': ['Source Sans 3', 'closest Google face with Greek: width 0.98, x-height 1.02, glyph IoU 0.73 (best at 300/400/600)'],
  'Aptos Display': ['Source Sans 3', 'as Aptos'],
  'Aptos Narrow': ['Source Sans 3', 'as Aptos'],
  'Segoe UI': ['Open Sans', 'same designer and proportions (Segoe UI cannot be measured off Windows)'],
  'Avenir Next': ['Nunito Sans', 'width 0.99–1.00; Ultra Light needs Outfit Thin (Nunito\'s lightest is 24 % heavier); Slides\' own Avenir has two weights only',
    { 100: ['Outfit', 100], 200: ['Outfit', 100], 300: ['Outfit', 100], 400: ['Nunito Sans', 400], 500: ['Nunito Sans', 600], 600: ['Nunito Sans', 700], 700: ['Nunito Sans', 700], 800: ['Nunito Sans', 700], 900: ['Nunito Sans', 700] }],
  'Avenir': ['Nunito Sans', 'as Avenir Next',
    { 100: ['Outfit', 100], 200: ['Outfit', 100], 300: ['Outfit', 100], 400: ['Nunito Sans', 400], 500: ['Nunito Sans', 600], 600: ['Nunito Sans', 700], 700: ['Nunito Sans', 700], 800: ['Nunito Sans', 700], 900: ['Nunito Sans', 700] }],
  'Helvetica': ['Helvetica', 'Slides has Helvetica in regular and bold only: the light weights from Helvetica Neue Light',
    { 100: ['Helvetica Neue', 100], 200: ['Helvetica Neue', 200], 300: ['Helvetica Neue', 300], 400: ['Helvetica', 400], 500: ['Helvetica Neue', 500], 600: ['Helvetica Neue', 600], 700: ['Helvetica', 700], 800: ['Helvetica', 700], 900: ['Helvetica', 700] }],
  'Menlo': ['JetBrains Mono', 'width 1.00, glyph IoU 0.76, Greek'],
  'Monaco': ['JetBrains Mono', 'monospaced, same advance'],
  'SF Mono': ['JetBrains Mono', 'monospaced, same advance'],
  // the macOS system face (system-ui / -apple-system; Chrome reports it as ".SF NS")
  // Roboto: glyph IoU 0.78–0.86 at 400–700 (64 px), Greek. Inter matches SF's width better at 14 px, but scored
  // worse on all five system-font decks compared in Slides (mean +0.04–0.10 %): glyph shape outweighs width there
  '.SF NS': ['Roboto', 'closest glyph shapes (IoU 0.78–0.86), Greek; Inter tested worse on five decks'],
  'SF Pro': ['Roboto', 'as .SF NS'], 'SF Pro Text': ['Roboto', 'as .SF NS'], 'SF Pro Display': ['Roboto', 'as .SF NS'],
  'System Font': ['Roboto', 'as .SF NS'], '.AppleSystemUIFont': ['Roboto', 'as .SF NS'], 'San Francisco': ['Roboto', 'as .SF NS'],
  'Futura': ['Jost', 'geometric, Futura proportions (Slides has only Futura Bold)'],
  'Optima': ['Marcellus', 'flared sans'], 'Baskerville': ['Libre Baskerville', 'Baskerville revival'],
  'Lucida Grande': ['Open Sans', 'humanist sans'], 'Geneva': ['Open Sans', 'humanist sans'],
};

const googleCache = new Map();
/** true when fonts.googleapis.com serves the family (Slides draws every Google Fonts family). */
export async function isGoogleFont(family) {
  if (googleCache.has(family)) return googleCache.get(family);
  let ok = false;
  try {
    const r = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}`, { signal: AbortSignal.timeout(15000) });
    ok = r.ok;
  } catch { ok = false; }
  googleCache.set(family, ok);
  return ok;
}

/** Nearest weight Slides has for a face (null list = every weight). */
function nearestWeight(list, w) {
  if (!list) return w;
  return list.slice().sort((a, b) => Math.abs(a - w) - Math.abs(b - w) || b - a)[0];
}

/**
 * Resolve the Slides face of every text run of the model, in place: r.gs = { family, weight }.
 * Returns { substitutions: Map('from → to', count), unknown: Set }.
 */
export async function resolveSlidesFonts(model) {
  const subs = new Map(), unknown = new Set();
  const decide = new Map();
  const runs = [];
  model.slides.forEach((s) => s.items.forEach((it) => { if (it.type === 'text') it.paragraph.runs.forEach((r) => runs.push(r)); }));
  for (const r of runs) {
    const src = r.rendered ? r.rendered.family : r.font;
    const weight = r.rendered ? r.rendered.weight : r.weight || 400;
    if (!decide.has(src)) {
      let fam = null, why = null, byWeight = null;
      if (Object.prototype.hasOwnProperty.call(SLIDES_FACES, src)) fam = src;
      else if (SUBSTITUTES[src]) { [fam, why, byWeight] = SUBSTITUTES[src]; }
      else if (/^\.SF/.test(src)) { [fam, why] = SUBSTITUTES['.SF NS']; }   // .SF NS Text, .SF NS Rounded…
      else if (await isGoogleFont(src)) fam = src;
      else { fam = 'Arial'; unknown.add(src); }
      decide.set(src, { fam, why, byWeight });
    }
    const d = decide.get(src);
    const pick = d.byWeight && d.byWeight[Math.min(900, Math.max(100, Math.round(weight / 100) * 100))];
    r.gs = pick ? { family: pick[0], weight: nearestWeight(SLIDES_FACES[pick[0]] || null, pick[1]) } : { family: d.fam, weight: nearestWeight(SLIDES_FACES[d.fam] || null, weight) };
    const label = `${r.font}${r.rendered ? ` (drawn as ${r.rendered.family})` : ''} → ${r.gs.family}`;
    if (r.gs.family !== r.font) subs.set(label, (subs.get(label) || 0) + 1);
  }
  return { substitutions: subs, unknown };
}
