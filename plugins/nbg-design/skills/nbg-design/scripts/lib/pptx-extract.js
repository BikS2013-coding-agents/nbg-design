/* NBG Design — slide extractor for export-pptx.mjs (evaluated in headless Chrome, after
 * lib/print-layout.js has laid every slide out at its native artboard size). Plain browser
 * JavaScript, no module syntax, no dependencies.
 *
 * nbgExtractPptx(opts) walks every top-level slide and returns, per slide, a flat list of drawing
 * items in paint order, in CSS px relative to the slide's top-left corner — the browser's own
 * layout, measured, never re-derived:
 *
 *   { type:'shape',  x,y,w,h, rot, geom:{prst|path}, fill, line, shadow }   boxes, borders, gradients
 *   { type:'image',  x,y,w,h, rot, src, crop:{l,t,r,b}, alpha, geom, svg }   <img>, CSS background
 *                                                                             images, <svg>, <canvas>
 *   { type:'text',   x,y,w,h, rot, wrap, align, lineHeight, paragraph }      one text box per block
 *                                                                             of text, with its runs
 *
 * Text stays text: every block element that holds text becomes one text box carrying the runs of
 * its inline content (font family, size, weight, italic, colour, letter-spacing, decoration, case,
 * super/subscript, links, <br> breaks). The box sits where Chrome put the lines: single-line text
 * gets an unwrapped box anchored like the CSS alignment, multi-line text a wrapping box as wide
 * as the element's content box (plus a small slack, so a renderer whose font metrics differ by a
 * hair does not add a line). ::before / ::after are first turned into real elements so they are
 * measured like everything else. Paint order follows CSS stacking (negative z-index, in-flow
 * blocks, positioned elements, positive z-index; opacity multiplied down the tree).
 *
 * Pictures keep their full source and are cropped through srcRect (object-fit / object-position,
 * background-size / -position and every overflow-clipping ancestor), so they stay re-croppable in
 * PowerPoint. A CSS filter (e.g. the Instrument photo grade) is baked into the pixels on a canvas.
 * Inline SVG is serialised with its computed styles and placed as an SVG picture with a PNG
 * fallback (PowerPoint: Graphics Format → Convert to Shape makes it native shapes).
 */

async function nbgExtractPptx(opts) {
  opts = opts || {};
  var sel = opts.selector || '.slide';
  var slack = opts.wrapSlack == null ? 0.02 : opts.wrapSlack;
  var keepBreaks = !!opts.keepLineBreaks;
  var all = Array.prototype.slice.call(document.querySelectorAll(sel));
  var slides = all.filter(function (s) { return !(s.parentElement && s.parentElement.closest(sel)); });
  var out = { slides: [], fonts: {}, warnings: [] };
  var warned = {};
  function warn(key, msg) { if (!warned[key]) { warned[key] = 0; out.warnings.push({ key: key, msg: msg, count: 0 }); } warned[key]++; out.warnings.forEach(function (w) { if (w.key === key) w.count = warned[key]; }); }

  slides.forEach(materializePseudo);
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { /* ignore */ }
  await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });

  var SVG_PROPS = ['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin',
    'stroke-dasharray', 'stroke-dashoffset', 'stroke-miterlimit', 'opacity', 'font-family', 'font-size', 'font-weight', 'font-style',
    'letter-spacing', 'text-anchor', 'dominant-baseline', 'alignment-baseline', 'stop-color', 'stop-opacity', 'visibility', 'display',
    'color', 'paint-order', 'vector-effect', 'mix-blend-mode', 'clip-rule', 'text-decoration'];
  var availCache = {};
  var ascCache = {};
  var fidSeq = 0;
  var lhCache = {};
  var OFFICE_FONTS = { 'Aptos': 1, 'Aptos Display': 1, 'Aptos Narrow': 1, 'Aptos Light': 1, 'Aptos SemiBold': 1, 'Calibri': 1, 'Calibri Light': 1,
    'Segoe UI': 1, 'Segoe UI Light': 1, 'Segoe UI Semibold': 1, 'Cambria': 1, 'Consolas': 1, 'Candara': 1, 'Corbel': 1, 'Constantia': 1 };
  var probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });

  for (var si = 0; si < slides.length; si++) {
    var slide = slides[si];
    var sr = slide.getBoundingClientRect();
    var ctx = { slide: slide, ox: sr.left, oy: sr.top, W: sr.width, H: sr.height, items: [], pending: [] };
    var scs = getComputedStyle(slide);
    var bg = null;
    var bgc = parseColor(scs.backgroundColor);
    if (bgc && bgc.a > 0) bg = bgc;
    // the slide's own background colour becomes the slide background; its background images,
    // borders and everything inside are items
    paintContext(slide, ctx, true);
    await Promise.all(ctx.pending);
    out.slides.push({ background: bg, items: ctx.items.filter(Boolean), notes: slideNotes(slide) });
  }
  out.width = slides.length ? slides[0].getBoundingClientRect().width : 0;
  out.height = slides.length ? slides[0].getBoundingClientRect().height : 0;
  return out;

  // ───────────────────────────── paint order ─────────────────────────────

  function createsContext(el, cs) {
    var pos = cs.position !== 'static';
    if (pos && cs.zIndex !== 'auto') return true;
    if (parseFloat(cs.opacity) < 1) return true;
    if (cs.transform !== 'none' || cs.filter !== 'none' || cs.isolation === 'isolate' || cs.mixBlendMode !== 'normal') return true;
    var p = el.parentElement && getComputedStyle(el.parentElement).display;
    if (cs.zIndex !== 'auto' && p && /flex|grid/.test(p)) return true;
    return false;
  }

  // Paint a stacking context: its own box, then its descendants in CSS layer order.
  function paintContext(el, ctx, isSlide) {
    var cs = getComputedStyle(el);
    var layers = { neg: [], block: [], inline: [], pos: [] };
    paintBox(el, cs, ctx.items, ctx, isSlide);
    paintReplaced(el, cs, ctx.items, ctx);
    paintText(el, cs, layers.inline, ctx);
    walk(el, layers, ctx);
    layers.neg.sort(function (a, b) { return a.z - b.z; });
    layers.pos.sort(function (a, b) { return a.z - b.z; });
    layers.neg.forEach(function (e) { push(ctx.items, e.items); });
    push(ctx.items, layers.block);
    push(ctx.items, layers.inline);
    layers.pos.forEach(function (e) { push(ctx.items, e.items); });
  }
  function push(dst, src) { for (var i = 0; i < src.length; i++) dst.push(src[i]); }

  function walk(parent, layers, ctx) {
    var kids = parent.children;
    for (var i = 0; i < kids.length; i++) {
      var c = kids[i];
      if (c.tagName === 'SCRIPT' || c.tagName === 'STYLE' || c.tagName === 'TEMPLATE' || c.tagName === 'NOSCRIPT') continue;
      if (c.classList && (c.classList.contains('nbg-print-shadow'))) continue;
      var cs = getComputedStyle(c);
      if (cs.display === 'none') continue;
      if (cs.display === 'contents') { walk(c, layers, ctx); continue; }
      if (parseFloat(cs.opacity) === 0) continue;
      if (createsContext(c, cs) || cs.position !== 'static') {
        var sub = { slide: ctx.slide, ox: ctx.ox, oy: ctx.oy, W: ctx.W, H: ctx.H, items: [], pending: ctx.pending };
        paintContext(c, sub, false);
        var z = cs.zIndex === 'auto' ? 0 : parseInt(cs.zIndex, 10) || 0;
        (z < 0 ? layers.neg : layers.pos).push({ z: z, items: sub.items });
        continue;
      }
      if (isInlineFlow(c, cs)) {
        // inline element inside a text block: its text is in the block's runs; only its box is painted here
        paintInlineBox(c, cs, layers.block, ctx);
        walk(c, layers, ctx);
        continue;
      }
      paintBox(c, cs, layers.block, ctx, false);
      paintReplaced(c, cs, layers.inline, ctx);
      paintText(c, cs, layers.inline, ctx);
      if (!isReplaced(c)) walk(c, layers, ctx);
    }
  }

  function isReplaced(el) {
    var t = el.tagName;
    return t === 'IMG' || t === 'svg' || t === 'SVG' || t === 'CANVAS' || t === 'VIDEO' || t === 'IFRAME' || t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || t === 'OBJECT' || t === 'EMBED' || t === 'PICTURE' && false;
  }
  function isInlineFlow(el, cs) {
    return cs.display === 'inline' && !isReplaced(el);
  }

  // ───────────────────────────── geometry ─────────────────────────────

  // cumulative 2D transform of an element relative to the slide: rotation (deg) and scale
  function transformOf(el) {
    var m = new DOMMatrix();
    var a = el;
    while (a && a !== ctxSlideOf(el)) {
      var t = getComputedStyle(a).transform;
      if (t && t !== 'none') { try { m = new DOMMatrix(t).multiply(m); } catch (e) { /* ignore */ } }
      a = a.parentElement;
    }
    var rot = Math.atan2(m.b, m.a) * 180 / Math.PI;
    var sx = Math.hypot(m.a, m.b), sy = Math.hypot(m.c, m.d);
    if (Math.abs(rot) < 0.05) rot = 0;
    return { rot: rot, sx: sx || 1, sy: sy || 1 };
  }
  function ctxSlideOf(el) { return el.closest ? el.closest(sel) : null; }

  // border box of an element in slide px; for a rotated element the unrotated box + rotation
  function boxOf(el, ctx) {
    var r = el.getBoundingClientRect();
    var tf = transformOf(el);
    if (tf.rot) {
      var w = el.offsetWidth * tf.sx, h = el.offsetHeight * tf.sy;
      if (!(w > 0)) { w = r.width; h = r.height; }
      var cx = r.left + r.width / 2 - ctx.ox, cy = r.top + r.height / 2 - ctx.oy;
      return { x: cx - w / 2, y: cy - h / 2, w: w, h: h, rot: tf.rot, sx: tf.sx, sy: tf.sy };
    }
    return { x: r.left - ctx.ox, y: r.top - ctx.oy, w: r.width, h: r.height, rot: 0, sx: tf.sx, sy: tf.sy };
  }

  // intersection of the overflow clips of every ancestor (slide included), in slide px
  function clipOf(el, ctx) {
    var c = { l: 0, t: 0, r: ctx.W, b: ctx.H };
    var a = el.parentElement;
    while (a) {
      var cs = getComputedStyle(a);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || a === ctx.slide) {
        var r = a.getBoundingClientRect();
        var bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0;
        var br = parseFloat(cs.borderRightWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
        c.l = Math.max(c.l, r.left - ctx.ox + bl); c.t = Math.max(c.t, r.top - ctx.oy + bt);
        c.r = Math.min(c.r, r.right - ctx.ox - br); c.b = Math.min(c.b, r.bottom - ctx.oy - bb);
        // the innermost rounded clip: content reaching its corners is cut along the curve
        if (!c.round && a !== ctx.slide) {
          var rr = radiiOf(cs, r.width, r.height);
          if (rr.some(function (p) { return p[0] > 0.5 && p[1] > 0.5; })) {
            c.round = { x: r.left - ctx.ox + bl, y: r.top - ctx.oy + bt, w: r.width - bl - br, h: r.height - bt - bb,
              rad: rr.map(function (p) { return [Math.max(0, p[0] - bl), Math.max(0, p[1] - bt)]; }) };
          }
        }
      }
      if (a === ctx.slide) break;
      a = a.parentElement;
    }
    return c;
  }

  // corners of an item that sit on the corners of a rounded clip take that clip's radii
  function roundedByClip(item, clip) {
    if (!clip || !clip.round || item.rot) return item;
    var R = clip.round, t = 1.5;
    var L = Math.abs(item.x - R.x) < t, T = Math.abs(item.y - R.y) < t, Rt = Math.abs(item.x + item.w - R.x - R.w) < t, B = Math.abs(item.y + item.h - R.y - R.h) < t;
    var own = item.geom && item.geom.prst === 'rect' ? [[0, 0], [0, 0], [0, 0], [0, 0]] : null;
    if (!own || !((L && T) || (Rt && T) || (Rt && B) || (L && B))) return item;
    var rad = [L && T ? R.rad[0] : own[0], Rt && T ? R.rad[1] : own[1], Rt && B ? R.rad[2] : own[2], L && B ? R.rad[3] : own[3]];
    item.geom = geomFor(rad, item.w, item.h);
    return item;
  }

  function opacityOf(el, ctx) {
    var o = 1, a = el;
    while (a) { o *= parseFloat(getComputedStyle(a).opacity); if (a === ctx.slide) break; a = a.parentElement; }
    return o;
  }

  // ───────────────────────────── colours ─────────────────────────────

  function parseColor(v) {
    if (!v || v === 'transparent' || v === 'none') return null;
    var m = v.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
    if (m) {
      var a = m[4] == null ? 1 : (m[4].slice(-1) === '%' ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
      return { r: Math.round(+m[1]), g: Math.round(+m[2]), b: Math.round(+m[3]), a: a };
    }
    // any other syntax (color(), oklch(), named): let the canvas resolve it to pixels
    try {
      probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#000'; probe.fillStyle = v; probe.fillRect(0, 0, 1, 1);
      var d = probe.getImageData(0, 0, 1, 1).data;
      return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    } catch (e) { return null; }
  }
  function withAlpha(c, k) { return c ? { r: c.r, g: c.g, b: c.b, a: c.a * k } : null; }

  // ───────────────────────────── boxes ─────────────────────────────

  function radiiOf(cs, w, h) {
    function one(v, ref) { var p = (v || '0').split(/\s+/); function n(s, rf) { return s && s.slice(-1) === '%' ? parseFloat(s) * rf / 100 : parseFloat(s) || 0; } return [n(p[0], w), n(p[1] || p[0], h)]; }
    var r = [one(cs.borderTopLeftRadius, w), one(cs.borderTopRightRadius, w), one(cs.borderBottomRightRadius, w), one(cs.borderBottomLeftRadius, w)];
    // CSS scales all radii down together when adjacent ones overflow a side
    function room(len, sum) { return sum > 0 ? len / sum : Infinity; }
    var f = Math.min(1, room(w, r[0][0] + r[1][0]), room(w, r[3][0] + r[2][0]), room(h, r[0][1] + r[3][1]), room(h, r[1][1] + r[2][1]));
    return r.map(function (p) { return [p[0] * f, p[1] * f]; });
  }
  // DrawingML geometry for a box with CSS corner radii
  function geomFor(rad, w, h) {
    var flat = rad.every(function (p) { return p[0] < 0.5 && p[1] < 0.5; });
    if (flat) return { prst: 'rect' };
    var same = rad.every(function (p) { return Math.abs(p[0] - rad[0][0]) < 0.5 && Math.abs(p[1] - rad[0][0]) < 0.5; });
    if (same) {
      var r = rad[0][0], m = Math.min(w, h);
      if (r >= m / 2 - 0.5 && Math.abs(w - h) < 0.5) return { prst: 'ellipse' };
      return { prst: 'roundRect', adj: Math.round(Math.min(50000, r / m * 100000)) };
    }
    if (rad.every(function (p) { return Math.abs(p[0] - w / 2) < 0.5 && Math.abs(p[1] - h / 2) < 0.5; })) return { prst: 'ellipse' };
    return { path: rad };   // per-corner radii: custom geometry, built by the writer
  }

  function paintBox(el, cs, dst, ctx, isSlide) {
    if (cs.visibility === 'hidden') return;
    var b = boxOf(el, ctx);
    if (!(b.w > 0.5 && b.h > 0.5)) return;
    var alpha = opacityOf(el, ctx);
    var rad = radiiOf(cs, b.w / b.sx, b.h / b.sy).map(function (p) { return [p[0] * b.sx, p[1] * b.sy]; });
    var geom = geomFor(rad, b.w, b.h);
    var clip = b.rot ? null : clipOf(el, ctx);
    var shadow = shadowOf(cs, alpha);

    // background colour
    var fillColor = parseColor(cs.backgroundColor);
    var bgLayers = splitLayers(cs.backgroundImage);
    var bgItems = [];
    if (!isSlide && fillColor && fillColor.a > 0) bgItems.push(shapeItem(b, geom, { solid: withAlpha(fillColor, alpha) }, clip));
    // background images, bottom layer first
    for (var i = bgLayers.length - 1; i >= 0; i--) {
      var L = bgLayers[i];
      if (L === 'none') continue;
      if (/^(repeating-)?linear-gradient/.test(L)) {
        var g = parseLinearGradient(L, b.w, b.h, alpha);
        if (g) bgItems.push(shapeItem(b, geom, { grad: g }, clip)); else warn('gradient', 'gradient could not be parsed: kept out');
      } else if (/^(repeating-)?radial-gradient/.test(L)) {
        var rg = parseRadialGradient(L, alpha);
        if (rg) bgItems.push(shapeItem(b, geom, { grad: rg }, clip));
      } else if (/^url\(/.test(L)) {
        var url = L.replace(/^url\(\s*["']?/, '').replace(/["']?\s*\)$/, '');
        bgItems.push(bgImageItem(el, cs, b, url, i, alpha, geom, clip, ctx));
      } else if (/^conic-gradient/.test(L)) {
        warn('conic', 'conic-gradient backgrounds are not converted (left out)');
      }
    }
    if (shadow && bgItems.length && bgItems[0].type === 'shape') bgItems[0].shadow = shadow;

    // borders
    var sides = ['Top', 'Right', 'Bottom', 'Left'].map(function (s) {
      return { w: (parseFloat(cs['border' + s + 'Width']) || 0) * (s === 'Top' || s === 'Bottom' ? b.sy : b.sx), style: cs['border' + s + 'Style'], color: withAlpha(parseColor(cs['border' + s + 'Color']), alpha) };
    });
    var vis = sides.map(function (s) { return s.w > 0 && s.style !== 'none' && s.style !== 'hidden' && s.color && s.color.a > 0; });
    var uniform = vis.every(Boolean) && sides.every(function (s) { return Math.abs(s.w - sides[0].w) < 0.01 && s.style === sides[0].style && sameColor(s.color, sides[0].color); });
    var borderItems = [];
    if (uniform) {
      var bw = sides[0].w;
      // CSS borders lie inside the box; a DrawingML outline is centred on the edge
      var ib = { x: b.x + bw / 2, y: b.y + bw / 2, w: b.w - bw, h: b.h - bw, rot: b.rot };
      var igeom = geom.prst === 'roundRect' ? { prst: 'roundRect', adj: Math.round(Math.min(50000, Math.max(0, rad[0][0] - bw / 2) / Math.min(ib.w, ib.h) * 100000)) }
        : geom.path ? { path: rad.map(function (p) { return [Math.max(0, p[0] - bw / 2), Math.max(0, p[1] - bw / 2)]; }) } : geom;
      var item = shapeItem(ib, igeom, null, clip);
      if (item) { item.line = { color: sides[0].color, w: bw, dash: dashOf(sides[0].style) }; borderItems.push(item); }
      if (shadow && !bgItems.length && item) item.shadow = shadow;
    } else {
      // one thin rectangle per visible side (rounded corners are not followed)
      var rects = [
        { x: b.x, y: b.y, w: b.w, h: sides[0].w }, { x: b.x + b.w - sides[1].w, y: b.y, w: sides[1].w, h: b.h },
        { x: b.x, y: b.y + b.h - sides[2].w, w: b.w, h: sides[2].w }, { x: b.x, y: b.y, w: sides[3].w, h: b.h }];
      for (var k = 0; k < 4; k++) {
        if (!vis[k]) continue;
        if (sides[k].style === 'dashed' || sides[k].style === 'dotted') {
          var horiz = k === 0 || k === 2, r = rects[k];
          var ln = { type: 'line', x1: horiz ? r.x : r.x + r.w / 2, y1: horiz ? r.y + r.h / 2 : r.y, x2: horiz ? r.x + r.w : r.x + r.w / 2, y2: horiz ? r.y + r.h / 2 : r.y + r.h,
            line: { color: sides[k].color, w: sides[k].w, dash: dashOf(sides[k].style) } };
          borderItems.push(ln);
        } else {
          var it = shapeItem(Object.assign({ rot: b.rot }, rects[k]), { prst: 'rect' }, { solid: sides[k].color }, clip);
          if (it) borderItems.push(it);
        }
      }
    }
    var outline = outlineOf(el, cs, b, alpha);
    push(dst, bgItems); push(dst, borderItems); if (outline) dst.push(outline);
  }

  function outlineOf(el, cs, b, alpha) {
    var w = parseFloat(cs.outlineWidth) || 0;
    if (!w || cs.outlineStyle === 'none') return null;
    var c = withAlpha(parseColor(cs.outlineColor), alpha);
    if (!c || !c.a) return null;
    var off = parseFloat(cs.outlineOffset) || 0;
    return { type: 'shape', x: b.x - off - w / 2, y: b.y - off - w / 2, w: b.w + 2 * off + w, h: b.h + 2 * off + w, rot: b.rot, geom: { prst: 'rect' }, fill: null, line: { color: c, w: w, dash: dashOf(cs.outlineStyle) } };
  }

  // background boxes of inline elements (highlights, pills): one rectangle per line fragment
  function paintInlineBox(el, cs, dst, ctx) {
    var c = parseColor(cs.backgroundColor);
    var bw = parseFloat(cs.borderBottomWidth) || 0, bc = parseColor(cs.borderBottomColor);
    var hasBorder = bw > 0 && cs.borderBottomStyle !== 'none' && bc && bc.a > 0;
    if (!(c && c.a > 0) && !hasBorder) return;
    var alpha = opacityOf(el, ctx);
    var rects = el.getClientRects();
    var rad = parseFloat(cs.borderTopLeftRadius) || 0;
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      var bx = { x: r.left - ctx.ox, y: r.top - ctx.oy, w: r.width, h: r.height, rot: 0 };
      if (c && c.a > 0) {
        var g = rad > 0.5 ? { prst: 'roundRect', adj: Math.round(Math.min(50000, rad / Math.min(bx.w, bx.h) * 100000)) } : { prst: 'rect' };
        var it = shapeItem(bx, g, { solid: withAlpha(c, alpha) }, null);
        if (it) dst.push(it);
      }
      if (hasBorder) dst.push(shapeItem({ x: bx.x, y: bx.y + bx.h - bw, w: bx.w, h: bw, rot: 0 }, { prst: 'rect' }, { solid: withAlpha(bc, alpha) }, null));
    }
  }

  function shapeItem(b, geom, fill, clip) {
    var x = b.x, y = b.y, w = b.w, h = b.h;
    if (clip && geom.prst === 'rect') {
      var l = Math.max(x, clip.l), t = Math.max(y, clip.t), r = Math.min(x + w, clip.r), bt = Math.min(y + h, clip.b);
      if (r - l < 0.05 || bt - t < 0.05) return null;
      x = l; y = t; w = r - l; h = bt - t;
    } else if (clip && (x >= clip.r || y >= clip.b || x + w <= clip.l || y + h <= clip.t)) return null;
    if (!(w > 0.05 && h > 0.05)) return null;
    return roundedByClip({ type: 'shape', x: x, y: y, w: w, h: h, rot: b.rot || 0, geom: geom, fill: fill, line: null }, clip);
  }

  function sameColor(a, b) { return a && b && a.r === b.r && a.g === b.g && a.b === b.b && Math.abs(a.a - b.a) < 0.01; }
  function dashOf(style) { return style === 'dashed' ? 'dash' : style === 'dotted' ? 'sysDot' : null; }

  function shadowOf(cs, alpha) {
    if (!cs.boxShadow || cs.boxShadow === 'none') return null;
    var layers = splitLayers(cs.boxShadow).map(function (s) {
      var inset = /\binset\b/.test(s);
      var color = (s.match(/rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}/) || [])[0];
      var rest = color ? s.replace(color, ' ') : s;
      var nums = (rest.match(/-?\d*\.?\d+(?=px)/g) || []).map(parseFloat);
      return { inset: inset, color: parseColor(color || 'rgba(0,0,0,1)'), x: nums[0] || 0, y: nums[1] || 0, blur: nums[2] || 0, spread: nums[3] || 0 };
    }).filter(function (l) { return !l.inset && l.color && l.color.a > 0; });
    if (!layers.length) return null;
    // DrawingML has one outer shadow per shape: take the strongest (largest blur) layer
    layers.sort(function (a, b) { return b.blur - a.blur; });
    var l = layers[0];
    return { x: l.x, y: l.y, blur: l.blur, spread: l.spread, color: withAlpha(l.color, alpha) };
  }

  // split a computed comma-separated list at top-level commas
  function splitLayers(v) {
    if (!v || v === 'none') return [];
    var outL = [], depth = 0, cur = '';
    for (var i = 0; i < v.length; i++) {
      var ch = v[i];
      if (ch === '(') depth++; else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { outL.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) outL.push(cur.trim());
    return outL;
  }

  // ───────────────────────────── gradients ─────────────────────────────

  function parseStops(parts, lenPx) {
    var stops = [];
    parts.forEach(function (p) {
      var col = (p.match(/^(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|[a-z]+(?:\([^)]*\))?)/) || [])[0];
      if (!col) return;
      var rest = p.slice(col.length).trim().split(/\s+/).filter(Boolean);
      var c = parseColor(col);
      if (!c) return;
      if (!rest.length) stops.push({ c: c, pos: null });
      rest.forEach(function (r) {
        var pos = r.slice(-1) === '%' ? parseFloat(r) / 100 : (parseFloat(r) / (lenPx || 1));
        stops.push({ c: c, pos: pos });
      });
    });
    if (!stops.length) return null;
    if (stops[0].pos == null) stops[0].pos = 0;
    if (stops[stops.length - 1].pos == null) stops[stops.length - 1].pos = 1;
    for (var i = 1; i < stops.length; i++) {
      if (stops[i].pos == null) {
        var j = i; while (stops[j].pos == null) j++;
        var a = stops[i - 1].pos, bpos = stops[j].pos;
        for (var k = i; k < j; k++) stops[k].pos = a + (bpos - a) * (k - i + 1) / (j - i + 1);
      }
      if (stops[i].pos < stops[i - 1].pos) stops[i].pos = stops[i - 1].pos;
    }
    return stops.map(function (s) { return { c: s.c, pos: Math.max(0, Math.min(1, s.pos)) }; });
  }

  function parseLinearGradient(v, w, h, alpha) {
    var inner = v.slice(v.indexOf('(') + 1, v.lastIndexOf(')'));
    var parts = splitLayers(inner);
    var angle = 180;
    var first = parts[0];
    if (/^-?[\d.]+(deg|rad|turn|grad)$/.test(first)) {
      var n = parseFloat(first);
      angle = /rad$/.test(first) ? n * 180 / Math.PI : /turn$/.test(first) ? n * 360 : /grad$/.test(first) ? n * 0.9 : n;
      parts.shift();
    } else if (/^to\s/.test(first)) {
      var d = first.replace(/^to\s+/, '');
      var map = { top: 0, right: 90, bottom: 180, left: 270 };
      if (map[d] != null) angle = map[d];
      else {   // corner: the angle depends on the box's aspect ratio
        var dx = /right/.test(d) ? 1 : -1, dy = /bottom/.test(d) ? 1 : -1;
        angle = (Math.atan2(dx * h, -dy * w) * 180 / Math.PI + 360) % 360;
      }
      parts.shift();
    }
    var rad = angle * Math.PI / 180;
    var len = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
    var stops = parseStops(parts, len);
    if (!stops) return null;
    return { kind: 'linear', angle: angle, stops: stops.map(function (s) { return { c: withAlpha(s.c, alpha), pos: s.pos }; }) };
  }

  function parseRadialGradient(v, alpha) {
    var inner = v.slice(v.indexOf('(') + 1, v.lastIndexOf(')'));
    var parts = splitLayers(inner);
    if (parts.length && !/^(rgba?|#|hsl)/.test(parts[0]) && /(circle|ellipse|at |closest|farthest|\d)/.test(parts[0]) && !/^[a-z]+$/.test(parts[0])) parts.shift();
    var stops = parseStops(parts, 0);
    if (!stops) return null;
    return { kind: 'radial', stops: stops.map(function (s) { return { c: withAlpha(s.c, alpha), pos: s.pos }; }) };
  }

  // ───────────────────────────── pictures ─────────────────────────────

  // crop fractions for an image of natural size (nw, nh) drawn at (dx, dy, dw, dh) and shown inside box
  function cropFor(dx, dy, dw, dh, box) {
    return { l: (box.x - dx) / dw, t: (box.y - dy) / dh, r: (dx + dw - box.x - box.w) / dw, b: (dy + dh - box.y - box.h) / dh };
  }
  function clipBox(box, clip) {
    if (!clip) return box;
    var l = Math.max(box.x, clip.l), t = Math.max(box.y, clip.t), r = Math.min(box.x + box.w, clip.r), b = Math.min(box.y + box.h, clip.b);
    if (r - l < 0.5 || b - t < 0.5) return null;
    return { x: l, y: t, w: r - l, h: b - t, rot: box.rot };
  }

  function posFrac(v, free) {   // object-position / background-position component → px offset
    if (v == null) return free / 2;
    v = String(v).trim();
    if (v === 'left' || v === 'top') return 0;
    if (v === 'right' || v === 'bottom') return free;
    if (v === 'center') return free / 2;
    if (v.slice(-1) === '%') return free * parseFloat(v) / 100;
    return parseFloat(v) || 0;
  }

  function paintReplaced(el, cs, dst, ctx) {
    if (cs.visibility === 'hidden') return;
    var t = el.tagName;
    if (t === 'IMG') return imageItem(el, cs, dst, ctx);
    if (t.toLowerCase() === 'svg') return svgItem(el, cs, dst, ctx);
    if (t === 'CANVAS') {
      var b = boxOf(el, ctx);
      try { dst.push({ type: 'image', x: b.x, y: b.y, w: b.w, h: b.h, rot: b.rot, src: el.toDataURL('image/png'), crop: null, alpha: opacityOf(el, ctx), geom: { prst: 'rect' } }); }
      catch (e) { warn('canvas', 'a <canvas> could not be read (tainted)'); }
      return;
    }
    if (t === 'VIDEO' || t === 'IFRAME' || t === 'OBJECT' || t === 'EMBED') warn('media', '<' + t.toLowerCase() + '> elements are not converted');
  }

  function imageItem(el, cs, dst, ctx) {
    if (!el.currentSrc && !el.src) return;
    var b = boxOf(el, ctx);
    if (!(b.w > 0.5 && b.h > 0.5)) return;
    var bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
    var pl = parseFloat(cs.paddingLeft) || 0, pt = parseFloat(cs.paddingTop) || 0, pr = parseFloat(cs.paddingRight) || 0, pb = parseFloat(cs.paddingBottom) || 0;
    var cb = { x: b.x + (bl + pl) * b.sx, y: b.y + (bt + pt) * b.sy, w: b.w - (bl + pl + br + pr) * b.sx, h: b.h - (bt + pt + bb + pb) * b.sy, rot: b.rot };
    var nw = el.naturalWidth || cb.w, nh = el.naturalHeight || cb.h;
    var fit = cs.objectFit || 'fill';
    var dw = cb.w, dh = cb.h;
    if (fit === 'cover' || fit === 'contain' || fit === 'scale-down' || fit === 'none') {
      var s = fit === 'cover' ? Math.max(cb.w / nw, cb.h / nh) : fit === 'none' ? 1 : Math.min(cb.w / nw, cb.h / nh);
      if (fit === 'scale-down') s = Math.min(1, s);
      dw = nw * s; dh = nh * s;
    }
    var op = (cs.objectPosition || '50% 50%').split(/\s+/);
    var dx = cb.x + posFrac(op[0], cb.w - dw), dy = cb.y + posFrac(op[1], cb.h - dh);
    var shown = clipBox(clipBox({ x: dx, y: dy, w: dw, h: dh, rot: b.rot }, { l: cb.x, t: cb.y, r: cb.x + cb.w, b: cb.y + cb.h }), b.rot ? null : clipOf(el, ctx));
    if (!shown) return;
    var rad = radiiOf(cs, b.w, b.h);
    var item = { type: 'image', x: shown.x, y: shown.y, w: shown.w, h: shown.h, rot: b.rot, src: null, crop: cropFor(dx, dy, dw, dh, shown),
      alpha: opacityOf(el, ctx), geom: geomFor(rad, shown.w, shown.h), shadow: shadowOf(cs, 1), descr: el.alt || '' };
    roundedByClip(item, b.rot ? null : clipOf(el, ctx));
    dst.push(item);
    ctx.pending.push(sourceOf(el, cs.filter).then(function (src) { item.src = src.url; if (src.svg) item.svg = src.svg; }));
  }

  // the image bytes as a data: URL; a CSS filter is baked into the pixels, other formats re-encoded
  function sourceOf(img, filter) {
    var url = img.currentSrc || img.src;
    var isSvg = /^data:image\/svg\+xml/i.test(url) || /\.svg(\?|#|$)/i.test(url);
    var plain = /^data:image\/(png|jpe?g|gif);/i.test(url);
    var needFilter = filter && filter !== 'none';
    if (plain && !needFilter) return Promise.resolve({ url: url });
    return new Promise(function (resolve) {
      var nw = img.naturalWidth, nh = img.naturalHeight;
      var k = isSvg ? Math.max(2, 2400 / Math.max(nw || 1, nh || 1)) : Math.min(1, 3200 / Math.max(nw, nh));
      var cw = Math.max(1, Math.round(nw * k)), ch = Math.max(1, Math.round(nh * k));
      var c = document.createElement('canvas'); c.width = cw; c.height = ch;
      var g = c.getContext('2d');
      if (needFilter) g.filter = filter;
      try {
        g.drawImage(img, 0, 0, cw, ch);
        var jpeg = /^data:image\/jpe?g/i.test(url) || /\.jpe?g(\?|#|$)/i.test(url);
        var data = jpeg ? c.toDataURL('image/jpeg', 0.92) : c.toDataURL('image/png');
        if (isSvg && !needFilter) {
          fetch(url).then(function (r) { return r.text(); }).then(function (t) { resolve({ url: data, svg: t }); }, function () { resolve({ url: data }); });
        } else resolve({ url: data });
      } catch (e) {
        warn('taint', 'an image could not be read (cross-origin) and was left out');
        resolve({ url: plain ? url : null });
      }
    });
  }

  function bgImageItem(el, cs, b, url, layer, alpha, geom, clip, ctx) {
    var item = { type: 'image', x: b.x, y: b.y, w: b.w, h: b.h, rot: b.rot, src: null, crop: null, alpha: alpha, geom: geom };
    ctx.pending.push(new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () {
        var nw = im.naturalWidth || b.w, nh = im.naturalHeight || b.h;
        var size = splitLayers(cs.backgroundSize)[layer] || splitLayers(cs.backgroundSize)[0] || 'auto';
        var pos = (splitLayers(cs.backgroundPosition)[layer] || splitLayers(cs.backgroundPosition)[0] || '0% 0%').split(/\s+/);
        var dw = nw, dh = nh;
        if (size === 'cover' || size === 'contain') {
          var s = size === 'cover' ? Math.max(b.w / nw, b.h / nh) : Math.min(b.w / nw, b.h / nh);
          dw = nw * s; dh = nh * s;
        } else {
          var sp = size.split(/\s+/);
          function dim(v, ref, nat, other, otherNat) { if (!v || v === 'auto') return null; return v.slice(-1) === '%' ? ref * parseFloat(v) / 100 : parseFloat(v); }
          var W2 = dim(sp[0], b.w), H2 = dim(sp[1], b.h);
          if (W2 != null && H2 == null) { H2 = W2 * nh / nw; } else if (H2 != null && W2 == null) { W2 = H2 * nw / nh; }
          if (W2 != null) { dw = W2; dh = H2; }
        }
        var dx = b.x + posFrac(pos[0], b.w - dw), dy = b.y + posFrac(pos[1], b.h - dh);
        var shown = clipBox(clipBox({ x: dx, y: dy, w: dw, h: dh, rot: b.rot }, { l: b.x, t: b.y, r: b.x + b.w, b: b.y + b.h }), clip);
        if (!shown) { item.src = null; return resolve(); }
        item.x = shown.x; item.y = shown.y; item.w = shown.w; item.h = shown.h;
        item.crop = cropFor(dx, dy, dw, dh, shown);
        if (geom.prst !== 'rect' && (Math.abs(shown.w - b.w) > 1 || Math.abs(shown.h - b.h) > 1)) item.geom = { prst: 'rect' };
        roundedByClip(item, clip);
        var fake = { currentSrc: url, src: url, naturalWidth: nw, naturalHeight: nh };
        if (/^data:image\/(png|jpe?g|gif);/i.test(url)) { item.src = url; return resolve(); }
        var c = document.createElement('canvas');
        var k = /svg/i.test(url) ? Math.max(2, 2400 / Math.max(nw, nh)) : 1;
        c.width = Math.round(nw * k); c.height = Math.round(nh * k);
        try { c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); item.src = c.toDataURL('image/png'); } catch (e) { warn('taint', 'an image could not be read (cross-origin) and was left out'); }
        if (/^data:image\/svg\+xml/i.test(url)) fetch(url).then(function (r) { return r.text(); }).then(function (t) { item.svg = t; resolve(); }, resolve);
        else resolve();
        void fake;
      };
      im.onerror = function () { warn('bgimg', 'a background image failed to load: ' + url.slice(0, 80)); resolve(); };
      im.src = url;
    }));
    return item;
  }

  // inline <svg>: serialise with computed presentation styles, embed as SVG + PNG fallback
  function svgItem(el, cs, dst, ctx) {
    var b = boxOf(el, ctx);
    if (!(b.w > 0.5 && b.h > 0.5)) return;
    var clone = el.cloneNode(true);
    var srcEls = [el].concat(Array.prototype.slice.call(el.querySelectorAll('*')));
    var dstEls = [clone].concat(Array.prototype.slice.call(clone.querySelectorAll('*')));
    for (var i = 0; i < srcEls.length; i++) {
      var s = getComputedStyle(srcEls[i]), d = dstEls[i];
      var decl = SVG_PROPS.filter(function (p) { return !(i === 0 && p === 'opacity'); }).map(function (p) {   // the root's opacity is the picture's transparency
        var v = s.getPropertyValue(p);
        if (p === 'fill' || p === 'stroke') v = v.replace(/currentcolor/i, s.color);
        return v ? p + ':' + v : '';
      }).filter(Boolean).join(';');
      d.setAttribute('style', decl);
      d.removeAttribute('class');
    }
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    var pw = el.clientWidth || b.w / b.sx, ph = el.clientHeight || b.h / b.sy;
    clone.setAttribute('width', pw); clone.setAttribute('height', ph);
    if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', '0 0 ' + pw + ' ' + ph);
    clone.style.removeProperty('position'); clone.style.removeProperty('left'); clone.style.removeProperty('top'); clone.style.removeProperty('right'); clone.style.removeProperty('bottom');
    clone.style.removeProperty('transform'); clone.style.setProperty('overflow', cs.overflow === 'visible' ? 'visible' : 'hidden');
    var text = new XMLSerializer().serializeToString(clone);
    // SVG content drawn outside the element box (overflow:visible) is cropped to the box
    var shown = b.rot ? b : clipBox(b, clipOf(el, ctx));
    if (!shown) return;
    var item = { type: 'image', x: shown.x, y: shown.y, w: shown.w, h: shown.h, rot: b.rot, src: null, svg: text,
      crop: b.rot ? null : cropFor(b.x, b.y, b.w, b.h, shown), alpha: opacityOf(el, ctx), geom: { prst: 'rect' }, descr: el.getAttribute('aria-label') || '' };
    dst.push(item);
    ctx.pending.push(new Promise(function (resolve) {
      var im = new Image();
      var k = Math.min(4, Math.max(2, 1600 / Math.max(pw, ph)));
      im.onload = function () {
        var c = document.createElement('canvas'); c.width = Math.round(pw * k); c.height = Math.round(ph * k);
        try { c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); item.src = c.toDataURL('image/png'); } catch (e) { warn('svgpng', 'an SVG fallback picture could not be drawn'); }
        resolve();
      };
      im.onerror = function () { warn('svgload', 'an inline SVG could not be rendered for its fallback picture'); resolve(); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);
    }));
  }

  // ───────────────────────────── text ─────────────────────────────

  // the runs of a block's inline content; null when it holds no visible text
  function runsOf(el) {
    var runs = [];
    var ws = getComputedStyle(el).whiteSpace;
    function visit(node, link) {
      for (var n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) {
          if (!n.data.length) continue;
          runs.push({ node: n, text: n.data, el: n.parentElement, link: link });
        } else if (n.nodeType === 1) {
          if (n.tagName === 'BR') { runs.push({ br: true, el: n.parentElement }); continue; }
          var cs = getComputedStyle(n);
          if (cs.display === 'none') continue;
          if (cs.display === 'contents') visit(n, link);
          else if (isInlineFlow(n, cs) && cs.position !== 'absolute' && cs.position !== 'fixed') {
            // the horizontal margin + border + padding of an inline box (a code or key chip) takes room in the
            // line that text does not: it is kept as a spacer (a zero-width character with that letter-spacing)
            var lsp = (parseFloat(cs.marginLeft) || 0) + (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.paddingLeft) || 0);
            var rsp = (parseFloat(cs.marginRight) || 0) + (parseFloat(cs.borderRightWidth) || 0) + (parseFloat(cs.paddingRight) || 0);
            if (lsp > 0.5) runs.push({ spacer: lsp, el: n, link: link });
            visit(n, n.tagName === 'A' && n.href ? n.href : link);
            if (rsp > 0.5) runs.push({ spacer: rsp, el: n, link: link });
          }
        }
      }
    }
    visit(el, el.closest && el.closest('a[href]') ? el.closest('a[href]').href : null);
    if (!runs.some(function (r) { return r.text && r.text.trim(); })) return null;
    return { runs: runs, ws: ws };
  }

  function paintText(el, cs, dst, ctx) {
    if (isReplaced(el) || isInlineFlow(el, cs)) return;
    var got = runsOf(el);
    if (!got) return;
    var runs = got.runs;
    var alpha = opacityOf(el, ctx);
    var tf = transformOf(el);
    // geometry of the rendered lines: one fragment per Range rect, with the baseline of its run's font
    var fs = parseFloat(cs.fontSize) * tf.sy;
    var lh = cs.lineHeight === 'normal' ? null : parseFloat(cs.lineHeight) * tf.sy;
    var frags = [];
    runs.forEach(function (r, ri) {
      if (!r.node) return;
      var rg = document.createRange(); rg.selectNodeContents(r.node);
      var rs = rg.getClientRects();
      var asc = null;
      for (var i = 0; i < rs.length; i++) {
        if (!(rs[i].width > 0.1 && rs[i].height > 0.1)) continue;
        if (asc == null) asc = ascentOf(r.el) * tf.sy;
        frags.push({ run: ri, l: rs[i].left, r: rs[i].right, t: rs[i].top, b: rs[i].bottom, c: (rs[i].top + rs[i].bottom) / 2, base: rs[i].top + asc, w: rs[i].width });
      }
    });
    if (!frags.length) return;
    // group the fragments into lines by vertical centre
    var lines = [];
    frags.slice().sort(function (a, b) { return a.c - b.c; }).forEach(function (f) {
      var L = lines[lines.length - 1];
      if (L && Math.abs(f.c - L.c) < Math.max(4, (lh || fs) * 0.45)) { L.l = Math.min(L.l, f.l); L.r = Math.max(L.r, f.r); L.t = Math.min(L.t, f.t); L.b = Math.max(L.b, f.b); L.frags.push(f); }
      else lines.push({ c: f.c, l: f.l, r: f.r, t: f.t, b: f.b, frags: [f] });
    });
    // each line's reference baseline is that of its widest fragment; a run drawn off it (sup, sub,
    // vertical-align: top, a relative offset) gets a baseline shift
    lines.forEach(function (L) {
      var ref = L.frags.reduce(function (m, f) { return f.w > m.w ? f : m; }, L.frags[0]);
      L.base = ref.base;
      L.frags.forEach(function (f) {
        if (runs[f.run].shift == null) runs[f.run].shift = L.base - f.base;
        // where a raised / lowered run was drawn (slide coordinates): a target without free baseline offsets
        // (Google Slides) sets it as a box of its own
        if (!runs[f.run].rect && Math.abs(L.base - f.base) > 1) runs[f.run].rect = { x: f.l - ctx.ox, y: f.t - ctx.oy, w: f.w, h: f.b - f.t, base: f.base - ctx.oy };
      });
    });
    var lineH = lh || (lines.length > 1 ? (lines[lines.length - 1].c - lines[0].c) / (lines.length - 1) : normalLineHeight(cs, tf));
    var baseline = lines[0].base;
    var firstSize = (function () { var f = lines[0].frags.reduce(function (m, f) { return f.w > m.w ? f : m; }, lines[0].frags[0]); return parseFloat(getComputedStyle(runs[f.run].el).fontSize) * tf.sy; })();
    // text-wrap: balance / pretty choose their breaks for looks, which a greedy renderer cannot reproduce:
    // Chrome's line breaks are carried over as line breaks (U+2028 marks, turned into <a:br/>)
    var tw = cs.textWrap || cs.textWrapStyle || '';
    // paragraphs with chips (inline boxes with padding) keep Chrome's breaks too: PowerPoint would break inside a
    // chip at a hyphen and leave its background behind
    var chips = runs.some(function (r) { return r.spacer; });
    if (lines.length > 1 && (/balance|pretty/.test(tw) || chips || keepBreaks)) markLineBreaks(runs, lineH);
    var paragraph = buildParagraph(runs, got.ws, alpha, tf);
    if (!paragraph.runs.length) return;
    var align = cs.textAlign;
    if (align === 'start') align = cs.direction === 'rtl' ? 'right' : 'left';
    if (align === 'end') align = cs.direction === 'rtl' ? 'left' : 'right';
    if (align === '-webkit-center') align = 'center';
    var minL = Math.min.apply(null, lines.map(function (l) { return l.l; })), maxR = Math.max.apply(null, lines.map(function (l) { return l.r; }));
    var top = lines[0].c - lineH / 2, bottom = lines[lines.length - 1].c + lineH / 2;
    var multi = lines.length > 1 && !paragraph.allBreaks(lines.length);
    var item = { type: 'text', rot: 0, lineHeight: lineH, fontSize: fs, align: align, paragraph: paragraph,
      baseline: baseline - ctx.oy, firstSize: firstSize,
      lines: lines.length, wrap: multi && got.ws !== 'nowrap' && got.ws !== 'pre', valign: 't' };
    var x, w;
    if (item.wrap && align === 'justify') {
      // justified text fills the element's content box
      var r = el.getBoundingClientRect();
      var pl = (parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth)) * tf.sx, pr = (parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth)) * tf.sx;
      x = Math.min(r.left + pl, minL); w = Math.max(r.width - pl - pr, maxR - x);
    } else if (item.wrap) {
      // wrapping text: the element's content width (the width Chrome wrapped at), but no wider than the widest
      // line Chrome drew plus the slack (text-wrap: balance / pretty and shrink-wrapped boxes leave free room
      // a greedy renderer would fill) — and never narrower than that line plus a hair
      var rr = el.getBoundingClientRect();
      var cw = rr.width - (parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth)) * tf.sx;
      var line = maxR - minL;
      x = minL;
      w = Math.max(line * 1.004 + 0.5, Math.min(cw, line * (1 + slack)));
      if (align === 'center') x = (minL + maxR) / 2 - w / 2; else if (align === 'right') x = maxR - w;
    } else {
      x = minL; w = maxR - minL;
      // the box hugs the text; give it room on the free side so a wider renderer does not clip
      var pad = Math.max(2, w * 0.04);
      if (align === 'center') { x -= pad / 2; w += pad; } else if (align === 'right') { x -= pad; w += pad; } else { w += pad; }
    }
    item.x = x - ctx.ox; item.y = top - ctx.oy; item.w = w; item.h = bottom - top;
    if (tf.rot) {   // rotated text: the element's own box, turned
      var bx = boxOf(el, ctx);
      item.x = bx.x; item.y = bx.y; item.w = bx.w; item.h = bx.h; item.rot = tf.rot; item.wrap = lines.length > 1; item.valign = 'ctr';
    }
    if (cs.display === 'list-item' && cs.listStyleType !== 'none' && !paragraph.bullet) {
      var marker = cs.listStyleType;
      var idx = 1; for (var p = el.previousElementSibling; p; p = p.previousElementSibling) if (p.tagName === 'LI') idx++;
      if (el.parentElement && el.parentElement.start > 1) idx += el.parentElement.start - 1;
      item.bullet = { type: marker, index: idx, indent: fs * 1.2, color: paragraph.runs[0].color };
      if (cs.listStylePosition !== 'inside') { item.x -= fs * 1.2; item.w += fs * 1.2; }
    }
    dst.push(item);
  }

  function buildParagraph(runs, ws, alpha, tf) {
    var pre = /^pre/.test(ws) || ws === 'break-spaces';
    var outRuns = [];
    var lastSpace = true;   // collapse leading white space
    runs.forEach(function (r) {
      if (r.br) { outRuns.push({ br: true, style: styleOf(r.el, alpha, tf) }); lastSpace = true; return; }
      if (r.spacer) {
        var sst = styleOf(r.el, alpha, tf);
        sst.spacing = r.spacer * tf.sx; sst.link = r.link || null; sst.baseline = 0;
        // the advance of a no-break space in that font (a target that drops the spacing writes spaces instead)
        var ccs = getComputedStyle(r.el); probe.font = ccs.fontStyle + ' ' + ccs.fontWeight + ' ' + ccs.fontSize + ' ' + ccs.fontFamily;
        sst.spaceW = probe.measureText('\u00A0').width * tf.sx;
        outRuns.push({ text: '\u200B', style: sst, spacer: true });
        return;
      }
      var t = r.text;
      if (!pre) {
        t = t.replace(/[\t\n\r\f ]+/g, ' ');
        if (lastSpace) t = t.replace(/^ /, '');
        if (!t) return;
        lastSpace = / $/.test(t);
      } else t = t.replace(/\r\n?/g, '\n');
      var st = styleOf(r.el, alpha, tf);
      if (st.hidden) return;
      if (r.shift != null && Math.abs(r.shift) > Math.max(1, st.size * 0.04)) { st.baseline = Math.round(r.shift / st.size * 100); st.rect = r.rect || null; }
      else if (r.shift != null) st.baseline = 0;
      st.link = r.link || null;
      if (st.transform === 'capitalize') t = t.replace(/(^|\s)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); });
      // pre-formatted newlines and Chrome's carried-over breaks (U+2028) become line breaks
      var pieces = (pre ? t.replace(/\u2028/g, '\n') : t.replace(/ ?\u2028 ?/g, '\n')).split('\n');
      pieces.forEach(function (p, i) {
        if (i > 0) outRuns.push({ br: true, style: st });
        if (p) outRuns.push({ text: p, style: st });
      });
    });
    // trailing white space of the paragraph and around line breaks
    for (var i = 0; i < outRuns.length; i++) {
      var r = outRuns[i];
      if (r.text != null && (i === outRuns.length - 1 || outRuns[i + 1].br) && !pre) r.text = r.text.replace(/ $/, '');
      if (r.text != null && i > 0 && outRuns[i - 1].br && !pre) r.text = r.text.replace(/^ /, '');
    }
    outRuns = outRuns.filter(function (r) { return r.br || r.text; });
    while (outRuns.length && outRuns[outRuns.length - 1].br) outRuns.pop();
    // merge neighbours with the same style
    var merged = [];
    outRuns.forEach(function (r) {
      var L = merged[merged.length - 1];
      if (L && !L.br && !r.br && !L.spacer && !r.spacer && sameStyle(L.style, r.style)) L.text += r.text; else merged.push({ br: r.br, text: r.text, style: r.style, spacer: r.spacer });
    });
    var flat = merged.map(function (r) {
      var s = r.style;
      out.fonts[s.font] = (out.fonts[s.font] || 0) + (r.text ? r.text.length : 0);
      return { br: !!r.br, text: r.text || '', font: s.font, size: s.size, weight: s.weight, italic: s.italic, color: s.color, spacing: s.spacing,
        underline: s.underline, strike: s.strike, caps: s.caps, baseline: s.baseline, link: s.link, fid: s.fid, rect: s.baseline && s.rect ? s.rect : undefined, spaceW: r.spacer ? s.spaceW : undefined };
    });
    var breaks = flat.filter(function (r) { return r.br; }).length;
    return { runs: flat, allBreaks: function (nLines) { return breaks >= nLines - 1; } };
  }

  function sameStyle(a, b) {
    return a.font === b.font && a.size === b.size && a.weight === b.weight && a.italic === b.italic && sameColor(a.color, b.color) &&
      a.spacing === b.spacing && a.underline === b.underline && a.strike === b.strike && a.caps === b.caps && a.baseline === b.baseline && a.link === b.link;
  }

  function styleOf(el, alpha, tf) {
    var cs = getComputedStyle(el);
    var color = parseColor(cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color && !/rgba\(0, 0, 0, 0\)/.test(cs.webkitTextFillColor) ? cs.webkitTextFillColor : cs.color);
    // gradient text (background-clip: text with a transparent fill): its first colour stop
    if ((!color || color.a === 0) && /text/.test(cs.webkitBackgroundClip || cs.backgroundClip || '')) {
      var g = /gradient/.test(cs.backgroundImage) ? parseLinearGradient(splitLayers(cs.backgroundImage)[0], 100, 100, 1) : null;
      if (g) color = g.stops[0].c; else warn('cliptext', 'background-clip:text without a gradient: text colour approximated');
    }
    var deco = cs.textDecorationLine || cs.textDecoration || '';
    var va = cs.verticalAlign;
    var baseline = va === 'super' ? 30 : va === 'sub' ? -25 : 0;
    var a = el, sup = null;
    while (a && !sup && a.tagName !== 'P' && a.tagName !== 'DIV') { if (a.tagName === 'SUP') sup = 30; else if (a.tagName === 'SUB') sup = -25; a = a.parentElement; }
    if (!baseline && sup) baseline = sup;
    var fam = firstFamily(cs.fontFamily);
    if (!el.hasAttribute('data-nbg-f')) el.setAttribute('data-nbg-f', String(++fidSeq));
    return {
      fid: el.getAttribute('data-nbg-f'),
      font: fam, size: parseFloat(cs.fontSize) * tf.sy, weight: parseInt(cs.fontWeight, 10) || 400, italic: cs.fontStyle !== 'normal',
      color: withAlpha(color || { r: 0, g: 0, b: 0, a: 1 }, alpha), spacing: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) * tf.sx,
      underline: /underline/.test(deco), strike: /line-through/.test(deco),
      caps: cs.textTransform === 'uppercase' ? 'all' : cs.fontVariantCaps === 'small-caps' || cs.fontVariant === 'small-caps' ? 'small' : null,
      transform: cs.textTransform, baseline: baseline, hidden: cs.visibility === 'hidden' || color && color.a === 0 && !/text/.test(cs.webkitBackgroundClip || '')
    };
  }

  // insert U+2028 into run texts where Chrome started a new line (at word starts and after hyphens)
  function markLineBreaks(runs, lineH) {
    var lastTop = null;
    runs.forEach(function (r) {
      if (!r.node) { if (r.br) lastTop = null; return; }
      var d = r.node.data, cuts = [];
      for (var i = 0; i < d.length; i++) {
        // a line starts at a word start, or right after a hyphen / dash / slash Chrome broke at ("non-|physical")
        if (/\s/.test(d[i]) || (i > 0 && !/[\s\-\u2010\u2013\u2014\/\u00AD]/.test(d[i - 1]))) continue;
        var rg = document.createRange(); rg.setStart(r.node, i); rg.setEnd(r.node, i + 1);
        var q = rg.getClientRects()[0];
        if (!q) continue;
        if (lastTop != null && q.top > lastTop + lineH * 0.5) cuts.push(i);
        lastTop = q.top;
      }
      if (!cuts.length) return;
      var t = r.text;
      for (var k = cuts.length - 1; k >= 0; k--) t = t.slice(0, cuts[k]) + '\u2028' + t.slice(cuts[k]);
      r.text = t;
    });
  }

  // the ascent Chrome gives an element's font (the content area above the baseline)
  function ascentOf(el) {
    var c = getComputedStyle(el);
    var key = c.fontStyle + ' ' + c.fontWeight + ' ' + c.fontSize + ' ' + c.fontFamily;
    if (!ascCache.hasOwnProperty(key)) { probe.font = key; ascCache[key] = probe.measureText('Hxg').fontBoundingBoxAscent; }
    return ascCache[key];
  }

  // the used value of line-height: normal for an element's font (line box of one line)
  function normalLineHeight(cs, tf) {
    var key = cs.fontStyle + '|' + cs.fontWeight + '|' + cs.fontSize + '|' + cs.fontFamily;
    if (!lhCache.hasOwnProperty(key)) {
      var d = document.createElement('div');
      d.style.cssText = 'position:absolute;left:-9999px;top:0;white-space:nowrap;line-height:normal;padding:0;border:0;margin:0';
      d.style.fontStyle = cs.fontStyle; d.style.fontWeight = cs.fontWeight; d.style.fontSize = cs.fontSize; d.style.fontFamily = cs.fontFamily;
      d.textContent = 'Hxg';
      document.body.appendChild(d); lhCache[key] = d.getBoundingClientRect().height; d.remove();
    }
    return lhCache[key] * tf.sy;
  }

  // Office's own faces (cloud fonts every PowerPoint has) are kept as authored even when this
  // browser lacks them: the .pptx is opened where they exist.

  // the first family of a font stack the browser actually used, unquoted
  function firstFamily(stack) {
    var fams = splitLayers(stack).map(function (f) { return f.replace(/^["']|["']$/g, '').trim(); });
    var generic = { 'sans-serif': 'Arial', serif: 'Times New Roman', monospace: 'Courier New', 'system-ui': null, '-apple-system': null, BlinkMacSystemFont: null, 'ui-sans-serif': null, cursive: 'Comic Sans MS', fantasy: 'Impact' };
    for (var i = 0; i < fams.length; i++) {
      var f = fams[i];
      if (generic.hasOwnProperty(f)) { if (generic[f]) return generic[f]; continue; }
      if (OFFICE_FONTS[f]) return f;
      try { if (document.fonts.check('16px "' + f + '"') && fontAvailable(f)) return f; } catch (e) { /* ignore */ }
    }
    // nothing resolvable: keep the author's first choice
    return fams[0] || 'Arial';
  }
  // a family counts when a web font of that name is loaded, or when it renders differently from the fallback
  function fontAvailable(f) {
    if (availCache.hasOwnProperty(f)) return availCache[f];
    var ok = false;
    document.fonts.forEach(function (ff) { if (ff.family.replace(/^["']|["']$/g, '') === f && ff.status === 'loaded') ok = true; });
    if (!ok) {
      var t = 'mmmmmmmmmmlli1WΩθ';
      probe.font = '72px monospace'; var a = probe.measureText(t).width;
      probe.font = '72px "' + f + '", monospace'; var b = probe.measureText(t).width;
      probe.font = '72px serif'; var c = probe.measureText(t).width;
      probe.font = '72px "' + f + '", serif'; var d = probe.measureText(t).width;
      ok = a !== b || c !== d;
    }
    availCache[f] = ok;
    return ok;
  }

  // ───────────────────────────── pseudo-elements ─────────────────────────────

  // ::before / ::after with visible content or a box become real <nbg-pseudo> elements carrying
  // the pseudo-element's computed style, so they are measured and painted like any element.
  function materializePseudo(root) {
    var els = [root].concat(Array.prototype.slice.call(root.querySelectorAll('*')));
    var todo = [];
    els.forEach(function (el) {
      if (isReplaced(el) || el.tagName === 'NBG-PSEUDO') return;
      ['::before', '::after'].forEach(function (p) {
        var cs = getComputedStyle(el, p);
        var c = cs.content;
        if (!c || c === 'none' || c === 'normal' || cs.display === 'none') return;
        var decl = [];
        for (var i = 0; i < cs.length; i++) { var prop = cs[i]; decl.push([prop, cs.getPropertyValue(prop)]); }
        todo.push({ el: el, before: p === '::before', decl: decl, content: c });
      });
    });
    todo.forEach(function (t) {
      var span = document.createElement('nbg-pseudo');
      t.decl.forEach(function (d) { if (d[0] !== 'content') span.style.setProperty(d[0], d[1]); });
      var parsed = contentText(t.content);
      if (parsed.url) { var im = document.createElement('img'); im.src = parsed.url; im.style.cssText = 'display:inline-block;width:auto;height:auto'; span.appendChild(im); }
      else if (parsed.text) span.textContent = parsed.text;
      if (parsed.unsupported) warn('content', 'generated content using counter()/attr() is approximated');
      t.el.setAttribute('data-nbg-pseudo', '');
      if (t.before) t.el.insertBefore(span, t.el.firstChild); else t.el.appendChild(span);
    });
    if (todo.length && !document.getElementById('nbg-pptx-pseudo')) {
      var st = document.createElement('style'); st.id = 'nbg-pptx-pseudo';
      st.textContent = '[data-nbg-pseudo]::before,[data-nbg-pseudo]::after{content:none!important;display:none!important}';
      document.head.appendChild(st);
    }
  }
  function contentText(c) {
    var outC = { text: '', url: null, unsupported: false };
    var re = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|url\(\s*["']?([^"')]*)["']?\s*\)|(counter|counters|attr)\([^)]*\)/g, m;
    while ((m = re.exec(c))) {
      if (m[1] != null || m[2] != null) outC.text += (m[1] != null ? m[1] : m[2]).replace(/\\([0-9a-fA-F]{1,6})\s?/g, function (x, h) { return String.fromCodePoint(parseInt(h, 16)); }).replace(/\\(.)/g, '$1');
      else if (m[3]) outC.url = m[3];
      else outC.unsupported = true;
    }
    return outC;
  }

  // speaker notes: <aside class="notes">, [data-notes] or <template class="notes"> inside the slide
  function slideNotes(slide) {
    var n = slide.getAttribute('data-notes');
    if (n) return n;
    var a = slide.querySelector('aside.notes, .speaker-notes, template.notes');
    if (!a) return null;
    return (a.tagName === 'TEMPLATE' ? a.content.textContent : a.textContent).replace(/\s+\n/g, '\n').trim() || null;
  }
}
